<template>
  <div id='book'>
    <div v-for='books in book' :key='books.image'>
      <img :src='books.image'/>
    </div>
  </div>
</template>

<script>
import $ from 'jquery'
import 'jquery-ui'
import '../assets/js/jquery-3.3.1.min.js'
import '../assets/js/modernizr.js'
import 'hammerjs'
import '../assets/js/jquery.easing.1.3.js'
import '../assets/js/wow.min.js'
import '../assets/js/wow_book.js'
import '../assets/css/books.css'
import '../assets/css/bookimages.css'
import '../assets/css/wow_book.css'

export default {
  name: 'PageTurner',
  data () {
    return {
      book: [],
      wowBook: []
    }
  },
  mounted () {
    fetch('/assets/book.json')
      .then(r => r.json())
      .then(data => {
        this.book = data
      })
    fetch('/assets/wowBook.json')
      .then(r => r.json())
      .then(data => {
        this.wowBook = data
        $('#book').wowBook({
          height: this.wowBook.settings.height,
          width: this.wowBook.settings.width,
          centeredWhenClosed: this.wowBook.settings.centeredWhenClosed,
          hardcovers: this.wowBook.settings.hardcovers,
          turnPageDuration: this.wowBook.settings.turnPageDuration,
          pageNumbers: this.wowBook.settings.pageNumbers,
          gutterShadow: this.wowBook.settings.gutterShadow,
          handleWidth: this.wowBook.settings.handleWidth,
          flipSound: this.wowBook.settings.flipSound,
          hardPages: this.wowBook.settings.hardPages,
          slideShow: this.wowBook.settings.slideShow,
          holdPage: this.wowBook.settings.holdPage,
          pauseOnHover: this.wowBook.settings.pauseOnHover,
          slideShowDelay: this.wowBook.settings.slideShowDelay,
          perspective: this.wowBook.settings.perspective,
          scaleToFit: '#app'
        })
      })
  }
}
</script>

<style>
#book {
  margin: 0 auto;
}
.wowbook-page-content {
  display:table-cell;
  vertical-align:middle;
  text-align:center;
  background-color: transparent;
}
.wowbook-page-content img {
  margin: 50% auto 0;
  display: block;
}
</style>
