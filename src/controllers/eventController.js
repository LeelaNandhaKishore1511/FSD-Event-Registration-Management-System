const Event = require("../models/Event");
const MainEvent = require("../models/MainEvent");
const Registration = require("../models/Registration");
const User = require("../models/User");

const toDateInput = (value) => new Date(value).toISOString().slice(0, 10);

const canManagementAccessEvent = (event, userId) => {
  if (!event || !userId) return false;

  const ownerId = String(event.createdBy?._id || event.createdBy || "");
  const mappedIds = Array.isArray(event.managementUsers)
    ? event.managementUsers.map((u) => String(u?._id || u))
    : [];

  return ownerId === String(userId) || mappedIds.includes(String(userId));
};

const resolveManagementUsersForEvent = async (mainEventId, managementUsers) => {
  if (!Array.isArray(managementUsers)) return [];

  const uniqueIds = [...new Set(managementUsers.filter(Boolean).map(String))];
  if (!uniqueIds.length) return [];

  const users = await User.find({
    _id: { $in: uniqueIds },
    role: "management",
    assignedMainEvent: mainEventId,
  }).select("_id");

  if (users.length !== uniqueIds.length) {
    throw new Error(
      "One or more management users are invalid or not mapped to this main event",
    );
  }

  return users.map((u) => u._id);
};

exports.createEvent = async (req, res) => {
  try {
    const {
      mainEvent,
      name,
      description,
      date,
      time,
      endDate,
      endTime,
      venue,
      domain,
      maxParticipants,
      eventType,
      registrationDeadline,
      managementUsers,
    } = req.body;

    if (
      !mainEvent ||
      !name ||
      !date ||
      !time ||
      !endDate ||
      !endTime ||
      !venue ||
      !maxParticipants ||
      !eventType ||
      !registrationDeadline
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parent = await MainEvent.findById(mainEvent);
    if (!parent) {
      return res.status(404).json({ message: "Main event not found" });
    }

    if (
      req.user.role === "organiser" &&
      String(parent.organiser) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only create events under your main events" });
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

      if (String(managementUser.assignedMainEvent) !== String(parent._id)) {
        return res.status(403).json({
          message: "You can only create events for your assigned main event",
        });
      }
    }

    const eventDate = new Date(date);
    const eventEndDate = new Date(endDate);

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid start or end date/time" });
    }

    if (endDateTime < startDateTime) {
      return res
        .status(400)
        .json({ message: "End date/time must be after start date/time" });
    }

    if (
      eventDate < new Date(parent.startDate) ||
      eventDate > new Date(parent.endDate) ||
      eventEndDate < new Date(parent.startDate) ||
      eventEndDate > new Date(parent.endDate)
    ) {
      return res.status(400).json({
        message: "Event start/end dates must be within main event date range",
      });
    }

    const resolvedManagementUsers = await resolveManagementUsersForEvent(
      parent._id,
      managementUsers,
    );

    const finalManagementUsers =
      req.user.role === "management"
        ? [
            ...new Set([
              String(req.user._id),
              ...resolvedManagementUsers.map((id) => String(id)),
            ]),
          ]
        : resolvedManagementUsers;

    const event = await Event.create({
      mainEvent,
      name,
      description,
      date,
      time,
      endDate,
      endTime,
      venue,
      domain,
      maxParticipants,
      eventType,
      registrationDeadline,
      createdBy: req.user._id,
      managementUsers: finalManagementUsers,
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEvents = async (req, res) => {
  let query = {};

  if (req.user.role === "organiser") {
    const mainEvents = await MainEvent.find({ organiser: req.user._id }).select(
      "_id",
    );
    const mainEventIds = mainEvents.map((m) => m._id);
    query = { mainEvent: { $in: mainEventIds } };
  }

  if (req.user.role === "management") {
    const managementUser = await User.findById(req.user._id).select(
      "assignedMainEvent",
    );

    if (!managementUser || !managementUser.assignedMainEvent) {
      return res.json([]);
    }

    query = {
      mainEvent: managementUser.assignedMainEvent,
      $or: [{ createdBy: req.user._id }, { managementUsers: req.user._id }],
    };
  }

  const events = await Event.find(query)
    .populate("mainEvent", "name startDate endDate")
    .populate("createdBy", "name email role")
    .populate("managementUsers", "name email")
    .sort({ date: 1 });

  res.json(events);
};

exports.deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("mainEvent", "organiser")
    .populate("managementUsers", "_id");
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (req.user.role === "organiser") {
    if (
      !event.mainEvent ||
      String(event.mainEvent.organiser) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only delete events from your main events" });
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
        message: "You can only delete events from your assigned main event",
      });
    }

    if (!canManagementAccessEvent(event, req.user._id)) {
      return res.status(403).json({
        message: "You can only delete sub-events assigned to your account",
      });
    }
  }

  await Event.findByIdAndDelete(req.params.id);

  await Registration.deleteMany({ event: req.params.id });
  res.json({ message: "Event and related registrations deleted" });
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("mainEvent", "organiser")
      .populate("managementUsers", "_id");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    let managementUser = null;
    if (req.user.role === "organiser") {
      if (
        !event.mainEvent ||
        String(event.mainEvent.organiser) !== String(req.user._id)
      ) {
        return res.status(403).json({
          message: "You can only update events from your main events",
        });
      }
    }

    if (req.user.role === "management") {
      managementUser = await User.findById(req.user._id).select(
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
          message: "You can only update events from your assigned main event",
        });
      }

      if (!canManagementAccessEvent(event, req.user._id)) {
        return res.status(403).json({
          message: "You can only update sub-events assigned to your account",
        });
      }
    }

    const targetMainEventId = req.body.mainEvent || event.mainEvent._id;
    const parent = await MainEvent.findById(targetMainEventId);
    if (!parent) {
      return res.status(404).json({ message: "Main event not found" });
    }

    if (
      req.user.role === "organiser" &&
      String(parent.organiser) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only move events to your main events" });
    }

    if (
      req.user.role === "management" &&
      String(managementUser.assignedMainEvent) !== String(parent._id)
    ) {
      return res.status(403).json({
        message: "You can only move events to your assigned main event",
      });
    }

    const nextDate = req.body.date || toDateInput(event.date);
    const nextTime = req.body.time || event.time;
    const nextEndDate =
      req.body.endDate || toDateInput(event.endDate || event.date);
    const nextEndTime = req.body.endTime || event.endTime || event.time;

    const startDateTime = new Date(`${nextDate}T${nextTime}`);
    const endDateTime = new Date(`${nextEndDate}T${nextEndTime}`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid start or end date/time" });
    }

    if (endDateTime < startDateTime) {
      return res
        .status(400)
        .json({ message: "End date/time must be after start date/time" });
    }

    const eventDate = new Date(nextDate);
    const eventEndDate = new Date(nextEndDate);
    if (
      eventDate < new Date(parent.startDate) ||
      eventDate > new Date(parent.endDate) ||
      eventEndDate < new Date(parent.startDate) ||
      eventEndDate > new Date(parent.endDate)
    ) {
      return res.status(400).json({
        message: "Event start/end dates must be within main event date range",
      });
    }

    let nextManagementUsers =
      req.body.managementUsers !== undefined
        ? await resolveManagementUsersForEvent(
            parent._id,
            req.body.managementUsers,
          )
        : event.managementUsers;

    if (req.user.role === "management") {
      nextManagementUsers = [
        ...new Set([
          String(req.user._id),
          ...(nextManagementUsers || []).map((id) => String(id)),
        ]),
      ];
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      {
        mainEvent: targetMainEventId,
        name: req.body.name || event.name,
        description:
          req.body.description !== undefined && req.body.description !== null
            ? req.body.description
            : event.description,
        date: nextDate,
        time: nextTime,
        endDate: nextEndDate,
        endTime: nextEndTime,
        venue: req.body.venue || event.venue,
        domain:
          req.body.domain !== undefined && req.body.domain !== null
            ? req.body.domain
            : event.domain,
        maxParticipants: req.body.maxParticipants || event.maxParticipants,
        eventType: req.body.eventType || event.eventType,
        registrationDeadline:
          req.body.registrationDeadline || event.registrationDeadline,
        managementUsers: nextManagementUsers,
      },
      { new: true, runValidators: true },
    );

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
