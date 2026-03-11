import fs from "fs/promises"
import path from "path"
import {exec} from "child_process"
import puppeteer from "puppeteer"
import wavefile from "wavefile"

let WaveFile = wavefile.WaveFile

let get_random_filename = async () => {
  global.App = {}
  let words_path = path.join(process.cwd(), `js`, `words.js`)
  let file_content = await fs.readFile(words_path, `utf-8`)
  eval(file_content)
  let words = global.App.words
  let index_one = Math.floor(Math.random() * words.length)
  let index_two = Math.floor(Math.random() * words.length)
  return `${words[index_one]}_${words[index_two]}.mp4`
}

let generate_random_audio = async duration_seconds => {
  let sample_rate = 44100
  let num_samples = sample_rate * duration_seconds
  let samples = []

  // Jovial settings: Pentatonic scale frequencies (Hz)
  let scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
  let bpm = 100 + Math.random() * 60 // Randomized tempo
  let samples_per_beat = Math.floor((sample_rate * 60) / bpm / 4) // 16th notes

  let phase = 0
  let freq = 0
  let amp = 0

  for (let current_sample = 0; current_sample < num_samples; current_sample++) {
    // Every "beat" (step), decide to play a new random note
    if ((current_sample % samples_per_beat) === 0) {
      if (Math.random() > 0.3) {
        freq = scale[Math.floor(Math.random() * scale.length)]
        amp = 0.5 + Math.random() * 0.5 // Hit the note
      }
    }

    // Exponential decay (makes it sound "plucked" and jovial)
    amp *= 0.9995

    // Basic oscillator
    phase += (2 * Math.PI * freq) / sample_rate
    if (phase > 2 * Math.PI) {
      phase -= 2 * Math.PI
    }

    // Add a tiny bit of "white noise" on the beat for percussion
    let noise = (current_sample % samples_per_beat < 500) ? (Math.random() * 0.1 * amp) : 0

    let signal = (Math.sin(phase) * amp) + noise
    let wave_value = signal * 16000
    samples.push(wave_value)
  }

  let wav = new WaveFile()
  wav.fromScratch(1, sample_rate, `16`, samples)
  let audio_path = path.join(process.cwd(), `bg_music.wav`)
  await fs.writeFile(audio_path, wav.toBuffer())
  return audio_path
}

let compile_html_to_video = async () => {
  let output_name = await get_random_filename()
  let browser = await puppeteer.launch()
  let page = await browser.newPage()
  await page.setViewport({width: 580, height: 880})

  let current_directory = process.cwd()
  let target_html = path.join(current_directory, `index.html`)
  let frames_directory = path.join(current_directory, `frames`)
  await fs.mkdir(frames_directory, {recursive: true})
  await page.goto(`file://${target_html}`)

  let duration_seconds = 10
  let interval_ms = 100
  let total_frames = (duration_seconds * 1000) / interval_ms

  for (let current_frame = 0; current_frame < total_frames; current_frame++) {
    let start_time = Date.now()
    let frame_string = current_frame.toString().padStart(3, `0`)
    let file_name = `frame_${frame_string}.png`
    let file_path = path.join(frames_directory, file_name)
    await page.screenshot({path: file_path})

    let elapsed_time = Date.now() - start_time
    let time_to_wait = interval_ms - elapsed_time
    if (time_to_wait > 0) {
      await new Promise(resolve => setTimeout(resolve, time_to_wait))
    }
  }

  await browser.close()
  let output_directory = path.join(current_directory, `videos`)
  await fs.mkdir(output_directory, {recursive: true})
  let output_path = path.join(output_directory, output_name)
  let audio_file = await generate_random_audio(duration_seconds)

  let ffmpeg_cmd = `ffmpeg -framerate 10 -i frames/frame_%03d.png -i ${audio_file} -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest ${output_path}`

  exec(ffmpeg_cmd, async error => {
    if (error) {
      console.error(`failed to create video:`, error)
    }
    else {
      console.log(`video compiled successfully as ${output_name}`)

      for (let current_frame = 0; current_frame < total_frames; current_frame++) {
        let frame_string = current_frame.toString().padStart(3, `0`)
        await fs.unlink(path.join(frames_directory, `frame_${frame_string}.png`))
      }

      await fs.rmdir(frames_directory)
      await fs.unlink(audio_file)
    }
  })
}

compile_html_to_video()