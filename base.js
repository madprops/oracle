const Oracle = {}
Oracle.show_delay = 1441

Oracle.init = function () {
	Oracle.set_volume()
	Oracle.play("atmo")

	setTimeout(function () {
		Oracle.show_word()
	}, Oracle.show_delay)

	setTimeout(function () {
		Oracle.show_word()
	}, Oracle.show_delay * 2)

	setTimeout(function () {
		Oracle.show_word()
	}, Oracle.show_delay * 3)

	setTimeout(function () {
		Oracle.show_card()
	}, Oracle.show_delay * 4)
}

Oracle.show_word = function () {
	let word = OracleWords[Oracle.get_random_int(0, OracleWords.length - 1)]
	let el = document.createElement("div")
	el.textContent = word
	el.classList.add("word")
	Oracle.el("#words").append(el)
	el.style.opacity = 1
	Oracle.play("pup")
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

Oracle.get_random_int = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

Oracle.el = function (query, root = document) {
	return root.querySelector(query)
}