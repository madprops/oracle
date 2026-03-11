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

  // setting up 3 independent tracks to play over each other
  let tracks = [
    {freq: 100, target_freq: 100, phase: 0, amp: 0, target_amp: 0},
    {freq: 300, target_freq: 300, phase: 0, amp: 0, target_amp: 0},
    {freq: 600, target_freq: 600, phase: 0, amp: 0, target_amp: 0}
  ]

  for (let current_sample = 0; current_sample < num_samples; current_sample++) {

    if ((current_sample % (sample_rate / 2)) === 0) {
      tracks[0].target_freq = 60 + Math.random() * 100
      tracks[0].target_amp = Math.random() * 0.8

      tracks[1].target_freq = 200 + Math.random() * 400
      tracks[1].target_amp = Math.random() * 0.6

      tracks[2].target_freq = 600 + Math.random() * 800
      tracks[2].target_amp = Math.random() * 0.4
    }

    let mixed_sample = 0

    for (let i = 0; i < tracks.length; i++) {
      let track = tracks[i]

      // smoothly glide current frequency toward the target (portamento)
      track.freq += (track.target_freq - track.freq) * 0.0005

      // smoothly crossfade the volume toward the target
      track.amp += (track.target_amp - track.amp) * 0.001

      track.phase += 2 * Math.PI * track.freq / sample_rate

      if (track.phase > 2 * Math.PI) {
        track.phase -= 2 * Math.PI
      }

      mixed_sample += Math.sin(track.phase) * track.amp
    }

    let amplitude = 16000
    let wave_value = mixed_sample / tracks.length * amplitude
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
        let file_name = `frame_${frame_string}.png`
        let file_path = path.join(frames_directory, file_name)

        await fs.unlink(file_path)
      }

      await fs.rmdir(frames_directory)
      await fs.unlink(audio_file)
      console.log(`cleaned up frames directory and audio`)
    }
  })
}

compile_html_to_video()