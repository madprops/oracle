const App = {}
App.show_delay = 1441

App.init = () => {
	App.set_volume()
	App.play(`atmo`)

	setTimeout(() => {
		App.show_word()
	}, App.show_delay)

	setTimeout(() => {
		App.show_word()
	}, App.show_delay * 2)

	setTimeout(() => {
		App.show_word()
	}, App.show_delay * 3)

	setTimeout(() => {
		App.show_card()
	}, App.show_delay * 4)
}

App.show_word = () => {
	let word = App.words[App.get_random_int(0, App.words.length - 1)]
	let el = document.createElement(`div`)
	el.textContent = word
	el.classList.add(`word`)
	App.el(`#words`).append(el)
	el.style.opacity = 1
	App.play(`pup`)
}

App.show_card = () => {
	let n = App.get_random_int(1, 22)
	let fname = `deck/${n}.gif`

	let img = document.createElement(`img`)
	img.id = `card`
	img.src = fname

	App.el(`#container`).append(img)
	img.style.opacity = 1
}

App.play = (what) => {
	App.el(`#${what}`).pause()
	App.el(`#${what}`).currentTime = 0
	App.el(`#${what}`).play()
}

App.set_volume = () => {
	App.el(`#atmo`).volume = 0.45
}

App.get_random_int = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

App.el = (query, root = document) => {
	return root.querySelector(query)
}