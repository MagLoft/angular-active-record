const changeCase = require("change-case")
const objectPath = require("object-path")

module.exports = function() {
  const config = {
    baseUrl: "/"
  }
  return {
    config,
    $get($http, $q, ActiveCollection) {
      return class ActiveRecord {
        constructor(attributes) {
          this.initialize(attributes)
        }

        initialize(attributes) {
          if (attributes) {
            if (!angular.isObject(attributes)) {
              throw new Error("Not a valid response type")
            }
            angular.merge(this, attributes)
            this.$previousAttributes = this.$new ? {} : attributes
          }
        }

        $syncResponse(response) {
          this.initialize(response.data)
          return this
        }

        save(attributes, options = {}) {
          if (attributes) {
            angular.extend(this, attributes)
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

        update(attributes = {}, options = {}) {
          options.data = attributes
          if (this.$new) {
            throw new Error("Unable to update a new / non-persisted record")
          }
          options.params = { id: this.id }
          this.$promise = this.$put(options)
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
          options.params = angular.extend({}, options.params, { id: this.id })
          return this.$get(options).then((response) => {
            const attributes = response.data
            this.initialize(attributes)
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

        $changed(path) {
          const oldValue = objectPath.get(this.$previousAttributes, path)
          const newValue = objectPath.get(this, path)
          return !angular.equals(newValue, oldValue)
        }

        attribute(path) {
          return objectPath.get(this, path)
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
          const opts = angular.copy(options)
          const url = opts.url || this.generateUrl(opts)
          angular.extend(opts, { method, url })
          return $http(opts)
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

        static where(params = {}, options = {}) {
          const collection = new ActiveCollection()
          return collection.$get(this, angular.extend({}, options, { params }))
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
            records.paramsTransformer = paramsTransformer
            records.parentRecord = parentRecord
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
