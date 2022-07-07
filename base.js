const Oracle = {}
Oracle.card_delay = 1400

Oracle.init = function () {
	Oracle.show_cards()
	Oracle.set_volume()
	Oracle.play("atmo")
}

Oracle.el = function (query, root = document) {
  return root.querySelector(query)
}

Oracle.els = function (query, root = document) {
  return Array.from(root.querySelectorAll(query))
}

Oracle.show_word = function (n) {
	let word = OracleWords[Oracle.get_random_int(0, OracleWords.length - 1)]
	let el = document.createElement("div")
	el.textContent = word
	el.classList.add("word")
	Oracle.el("#words").append(el)
	el.style.opacity = 1	
}

Oracle.show_cards = function () {
	setTimeout(function () {
		Oracle.show_word(1)
	}, Oracle.card_delay)

	setTimeout(function () {
		Oracle.show_word(2)
	}, Oracle.card_delay * 2)

	setTimeout(function () {
		Oracle.show_word(3)
	}, Oracle.card_delay * 3)

	setTimeout(function () {
		Oracle.show_card()
	}, Oracle.card_delay * 4)
}

Oracle.get_random_int = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

Oracle.show_card = function () {
	let n = Oracle.get_random_int(1, 22)
	let fname = `deck/${n}.gif`

	let img = document.createElement("img")
	img.id = "card"
	img.src = fname

	Oracle.el("#container").append(img)
	img.style.opacity = 1
}

Oracle.play = function (what) {
	Oracle.el(`#${what}`).pause()
	Oracle.el(`#${what}`).currentTime = 0
	Oracle.el(`#${what}`).play()
}

Oracle.set_volume = function () {
	Oracle.el("#atmo").volume = 0.45
}