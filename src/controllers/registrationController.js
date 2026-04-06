const Event = require("../models/Event");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMember");
const Registration = require("../models/Registration");
const User = require("../models/User");

const canManagementAccessEvent = (event, userId) => {
  if (!event || !userId) return false;

  const ownerId = String(event.createdBy?._id || event.createdBy || "");
  const mappedIds = Array.isArray(event.managementUsers)
    ? event.managementUsers.map((u) => String(u?._id || u))
    : [];

  return ownerId === String(userId) || mappedIds.includes(String(userId));
};

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, teamId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res
        .status(400)
        .json({ message: "Registration deadline has passed" });
    }

    const existingUserReg = await Registration.findOne({
      user: req.user._id,
      event: eventId,
    });
    if (existingUserReg) {
      return res
        .status(409)
        .json({ message: "You are already registered for this event" });
    }

    if (event.eventType === "individual") {
      const currentCount = await Registration.countDocuments({
        event: eventId,
        status: "confirmed",
      });
      if (currentCount >= event.maxParticipants) {
        return res.status(400).json({ message: "Event is full" });
      }

      const reg = await Registration.create({
        user: req.user._id,
        event: eventId,
      });
      return res.status(201).json(reg);
    }

    if (!teamId) {
      return res
        .status(400)
        .json({ message: "teamId is required for team events" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (String(team.event) !== String(eventId)) {
      return res
        .status(400)
        .json({ message: "Team is not mapped to this event" });
    }

    if (String(team.teamLeader) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only team leader can register the team" });
    }

    const members = await TeamMember.find({ team: teamId }).select("user");
    const allUserIds = [team.teamLeader, ...members.map((m) => m.user)];

    const alreadyRegistered = await Registration.find({
      user: { $in: allUserIds },
      event: eventId,
    });
    if (alreadyRegistered.length > 0) {
      return res
        .status(409)
        .json({ message: "One or more team members are already registered" });
    }

    const currentCount = await Registration.countDocuments({
      event: eventId,
      status: "confirmed",
    });
    if (currentCount + allUserIds.length > event.maxParticipants) {
      return res
        .status(400)
        .json({ message: "Not enough slots for the complete team" });
    }

    const docs = allUserIds.map((userId) => ({
      user: userId,
      event: eventId,
      team: teamId,
      status: "confirmed",
    }));

    const created = await Registration.insertMany(docs);
    return res.status(201).json({
      message: "Team registered successfully",
      registrations: created,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

exports.myRegistrations = async (req, res) => {
  const data = await Registration.find({ user: req.user._id })
    .populate("event", "name date venue eventType")
    .populate("team", "teamName");

  res.json(data);
};

exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate("mainEvent", "name organiser")
      .populate("managementUsers", "_id");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (req.user.role === "organiser") {
      if (
        !event.mainEvent ||
        String(event.mainEvent.organiser) !== String(req.user._id)
      ) {
        return res.status(403).json({
          message: "You can only view registrations for your own main events",
        });
      }
    }

    if (req.user.role === "management") {
      const managementUser = await User.findById(req.user._id).select(
        "assignedMainEvent",
      );

      if (!managementUser || !managementUser.assignedMainEvent) {
        return res.status(403).json({
          message: "No main event assigned to this management account",
        });
      }

      if (
        !event.mainEvent ||
        String(managementUser.assignedMainEvent) !== String(event.mainEvent._id)
      ) {
        return res.status(403).json({
          message:
            "You can only view registrations for your assigned main event",
        });
      }

      if (!canManagementAccessEvent(event, req.user._id)) {
        return res.status(403).json({
          message:
            "You can only view registrations for sub-events assigned to your account",
        });
      }
    }

    const registrations = await Registration.find({ event: event._id })
      .populate("user", "name email department year")
      .populate("team", "teamName")
      .sort({ createdAt: -1 });

    res.json({
      event: {
        _id: event._id,
        name: event.name,
        date: event.date,
        endDate: event.endDate,
        time: event.time,
        endTime: event.endTime,
        venue: event.venue,
        eventType: event.eventType,
        mainEvent: event.mainEvent,
      },
      registrations,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
