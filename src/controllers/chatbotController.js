const Event = require("../models/Event");
const Registration = require("../models/Registration");

const detectIntent = (message = "") => {
  const text = message.toLowerCase();

  if (/hi|hello|hey/.test(text)) return "greeting";
  if (/show|list|available/.test(text) && /event/.test(text))
    return "show_events";
  if (/detail|about/.test(text) && /event/.test(text)) return "event_details";
  if (/register|registration/.test(text) && /help|how/.test(text))
    return "register_help";
  if (/team/.test(text) && /help|create|member/.test(text)) return "team_help";
  if (/my/.test(text) && /registration/.test(text)) return "my_registrations";
  return "unknown";
};

exports.chatbot = async (req, res) => {
  try {
    const { message } = req.body;
    const intent = detectIntent(message);

    switch (intent) {
      case "greeting":
        return res.json({
          reply:
            "Hello! I can help you explore events, registrations, and team setup.",
        });
      case "show_events": {
        const events = await Event.find()
          .select("name date time venue eventType")
          .sort({ date: 1 });
        return res.json({
          reply: "Here are the available events.",
          data: events,
        });
      }
      case "event_details": {
        const events = await Event.find()
          .select("name domain date time venue registrationDeadline")
          .sort({ date: 1 });
        return res.json({
          reply: "These are the latest event details.",
          data: events,
        });
      }
      case "register_help":
        return res.json({
          reply:
            "To register: open your dashboard, pick an event, click Register. For team events, create a team first and then register as team leader.",
        });
      case "team_help":
        return res.json({
          reply:
            "Use Team Management page: create team, add members, then register that team for a team-based event.",
        });
      case "my_registrations": {
        if (!req.user) {
          return res.json({
            reply: "Please login to view your registrations.",
          });
        }
        const regs = await Registration.find({ user: req.user._id })
          .populate("event", "name date venue")
          .populate("team", "teamName");
        return res.json({ reply: "These are your registrations.", data: regs });
      }
      default:
        return res.json({
          reply:
            'I did not understand that. Try: "show events", "event details", "register help", or "team help".',
        });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
