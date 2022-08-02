const  mongoose = require("mongoose");
const Schema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  blacklist: {
    type: Boolean,
    default: false,
    required: false
  },
  info: {
    type: Object,
    default: {},
    required: false
  }
});
module.exports = mongoose.model("user", Schema);