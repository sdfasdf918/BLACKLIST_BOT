const  mongoose = require("mongoose");
const Schema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  channel: {
    type: String,
    required: true
  },
  ban: {
    type: Boolean,
    default: true,
    required: false
  }
});
module.exports = mongoose.model("guild", Schema);