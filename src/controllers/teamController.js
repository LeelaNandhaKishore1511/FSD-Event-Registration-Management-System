const Team = require("../models/Team");
const TeamMember = require("../models/TeamMember");
const Event = require("../models/Event");

exports.createTeam = async (req, res) => {
  try {
    const { teamName, eventId } = req.body;
    if (!teamName || !eventId) {
      return res
        .status(400)
        .json({ message: "teamName and eventId are required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.eventType !== "team") {
      return res
        .status(400)
        .json({ message: "Team can only be created for team-based events" });
    }

    const existingTeam = await Team.findOne({
      event: eventId,
      teamLeader: req.user._id,
    });
    if (existingTeam) {
      return res
        .status(400)
        .json({ message: "You already lead a team for this event" });
    }

    const team = await Team.create({
      teamName,
      teamLeader: req.user._id,
      event: eventId,
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    if (!teamId || !userId) {
      return res
        .status(400)
        .json({ message: "teamId and userId are required" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (String(team.teamLeader) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only team leader can manage members" });
    }

    const alreadyInAnotherTeam = await TeamMember.findOne({
      user: userId,
    }).populate("team");
    if (
      alreadyInAnotherTeam &&
      String(alreadyInAnotherTeam.team.event) === String(team.event)
    ) {
      return res
        .status(400)
        .json({ message: "User is already in another team for this event" });
    }

    const memberCount = await TeamMember.countDocuments({ team: teamId });
    if (memberCount >= 5) {
      return res
        .status(400)
        .json({ message: "Team size limit reached (max 6 including leader)" });
    }

    const member = await TeamMember.create({ team: teamId, user: userId });
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (String(team.teamLeader) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only team leader can manage members" });
    }

    const removed = await TeamMember.findOneAndDelete({
      team: teamId,
      user: userId,
    });
    if (!removed) {
      return res.status(404).json({ message: "Member not found in team" });
    }

    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.myTeams = async (req, res) => {
  const led = await Team.find({ teamLeader: req.user._id }).populate(
    "event",
    "name date eventType",
  );
  const memberships = await TeamMember.find({ user: req.user._id }).populate({
    path: "team",
    populate: { path: "event", select: "name date eventType" },
  });

  res.json({ ledTeams: led, memberships });
};
