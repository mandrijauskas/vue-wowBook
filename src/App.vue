<template>
  <div id="app">
    <PageTurner/>
  </div>
</template>

<script>
import PageTurner from './components/PageTurner.vue'

export default {
  name: 'app',
  components: {
    PageTurner
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #ffffff;
}
</style>
