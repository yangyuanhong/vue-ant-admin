<template>
  <div class="model">
    <h2>子组件</h2>
    <input :value="value" type="text" @input="onInput">
  </div>
</template>
<script >
export default {
  model: {
    prop: "checked",
    event: "change"
  },
  props: {
    checked: {
      type: String,
      default:""
    }
  },
  methods: {
    onInput(event) {
      console.log("->>>");
      this.$emit("change", event.target.value, "子组件传递")
    }
  }
}
</script>
<style scoped>
</style>