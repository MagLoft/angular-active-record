const ActiveRecordProvider = require("./classes/ActiveRecordProvider.js")
const ActiveCollection = require("./classes/ActiveCollection.js")

angular.module("active-record", [])
.provider("ActiveRecord", ActiveRecordProvider)
.factory("ActiveCollection", ActiveCollection)
