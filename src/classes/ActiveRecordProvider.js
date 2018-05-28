const changeCase = require("change-case")

module.exports = function() {
  const config = {
    baseUrl: "/"
  }
  return {
    config,
    $get($http, $q, ActiveCollection) {
      return class ActiveRecord {
        constructor(properties) {
          if (properties) {
            angular.extend(this, properties)
            this.$previousAttributes = this.$new ? {} : properties
          }
          if (this.initialize) {
            this.initialize()
          }
        }

        save(values, options = {}) {
          if (values) {
            angular.extend(this, values)
          }
          options.data = this.$changedAttributes
          if (this.$new) {
            this.$promise = this.$post(options)
          }else {
            options.params = { id: this.id }
            this.$promise = this.$put(options)
          }
          this.$promise.then(this.$syncResponse.bind(this))
          return this
        }

        destroy(options = {}) {
          if (this.$collection) {
            this.$collection.remove(this)
          }
          options.params = { id: this.id }
          this.$promise = this.$new ? $q.resolve(this) : this.$delete(options).then(() => this)
          return this
        }

        reload(options = {}) {
          angular.extend(options, { params: { id: this.id } })
          return this.$get(options).then((response) => {
            const data = response.data
            if (!angular.isObject(data)) {
              throw new Error("Not a valid response type")
            }
            angular.extend(this, data)
            this.$previousAttributes = data
            return this
          })
        }

        get $attributes() {
          const values = {}
          for (const field of this.constructor.attributes) {
            if (angular.isDefined(this[field])) {
              values[field] = this[field]
            }
          }
          return values
        }

        $changed(property) {
          const changed = this.$changedAttributes
          if (property) {
            return property in changed
          }
          for (const i in changed) {
            return true
          }
          return false
        }

        get $changedAttributes() {
          const changed = {}
          const attributes = this.$attributes
          Object.entries(this.$previousAttributes).forEach(([property, value]) => {
            if (angular.isUndefined(value)) {
              changed[property] = value
            }
          })
          Object.entries(attributes).forEach(([property, value]) => {
            if (angular.equals(value, this.$previousAttributes[property]) === false) {
              changed[property] = value
            }
          })
          return changed
        }

        get $new() {
          return this.id == null
        }

        $get(options) {
          return this.constructor.request("GET", options)
        }

        $post(options) {
          return this.constructor.request("POST", options)
        }

        $put(options) {
          return this.constructor.request("PUT", options)
        }

        $delete(options) {
          return this.constructor.request("DELETE", options)
        }

        $syncResponse({ data }) {
          if (!angular.isObject(data)) {
            throw new Error("Not a valid response type")
          }
          angular.extend(this, data)
          this.$previousAttributes = data
          return this
        }

        static get attributes() {
          return []
        }

        static get path() {
          return ""
        }

        static get params() {
          return {}
        }

        static generateUrl(options = {}) {
          const path = options.path || this.path
          const params = angular.extend({}, this.params, options.params)
          return `${config.baseUrl}/${path}`.replace(/:([^:/]+)/g, (match, property) => {
            if (options.params && options.params[property]) {
              delete options.params[property]
            }
            return params[property] || ""
          })
        }

        static request(method, options = {}) {
          const url = options.url || this.generateUrl(options)
          angular.extend(options, { method, url })
          return $http(options)
        }

        static find(id, options) {
          const model = new this({ id })
          model.$promise = model.reload(options)
          return model
        }

        static all(options = {}) {
          const collection = new ActiveCollection()
          return collection.$get(this, options)
        }

        static recordName() {
          return changeCase.snakeCase(this.name)
        }

        static hasMany(method, ModelType, paramsTransformer) {
          const recordName = this.recordName()
          this.prototype[`${method}`] = function(params = {}) {
            const parentRecord = this
            if (angular.isFunction(paramsTransformer)) {
              paramsTransformer.call(this, params)
            }
            const records = ModelType.all({ params })
            records.$promise.then(() => {
              for (const record of records) {
                record[`${recordName}`] = parentRecord
              }
              return records
            })
            return records
          }
        }
      }
    }
  }
}
