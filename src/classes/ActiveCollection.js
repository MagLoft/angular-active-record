module.exports = function($q) {
  return class ActiveCollection extends Array {
    $get(RecordClass, options = {}) {
      this.RecordClass = RecordClass
      this.$promise = this.RecordClass.request("GET", options).then((response) => {
        const records = response.data.map((item) => {
          const record = new RecordClass(item)
          record.$collection = this
          return record
        })
        this.push(...records)
        return $q.resolve(this)
      })
      return this
    }

    findById(id) {
      const record = this.find(r => r.id === id) || new this.RecordClass()
      record.$promise = record.id ? $q.resolve(record) : $q.reject(`${this.RecordClass.name} not found`)
      return record
    }

    findBy(values) {
      const record = this.find((r) => {
        for (const [key, value]of Object.entries(values)) {
          if (r[key] !== value) {
            return false
          }
        }
        return true
      })
      if (!record) {
        return $q.reject("Record not found")
      }
      record.$promise = $q.resolve(record)
      return record
    }

    create(arg, options) {
      const record = (arg instanceof this.RecordClass) ? arg : new this.RecordClass(arg)
      record.$collection = this
      this.push(record)
      return record.save({}, options)
    }

    destroy(record, options) {
      this.remove(record)
      return record.destroy(options)
    }

    remove(record) {
      const index = this.findIndex(item => record.id === item.id)
      if (index !== -1) {
        this.splice(index, 1)
      }
    }
  }
}
