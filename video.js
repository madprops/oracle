import fs from "fs/promises"
import path from "path"
import {exec} from "child_process"
import puppeteer from "puppeteer"
import wavefile from "wavefile"

let WaveFile = wavefile.WaveFile

let get_dirname = () => {
  return import.meta.dirname
}

let get_output_path = async requested_path => {
  let target_directory
  let base_name

  if (!requested_path) {
    target_directory = path.join(get_dirname(), `videos`)
    global.App = {}
    let words_path = path.join(get_dirname(), `js`, `words.js`)
    let file_content = await fs.readFile(words_path, `utf-8`)
    eval(file_content)
    let words = global.App.words
    let index_one = Math.floor(Math.random() * words.length)
    let index_two = Math.floor(Math.random() * words.length)
    base_name = `${words[index_one]}_${words[index_two]}`
  }
  else {
    let resolved_path = path.resolve(requested_path)
    target_directory = path.dirname(resolved_path)
    base_name = path.basename(resolved_path).replace(/\.mp4$/, ``)
  }

  await fs.mkdir(target_directory, {recursive: true})
  let current_name = `${base_name}.mp4`
  let counter = 2

  while (true) {
    let full_path = path.join(target_directory, current_name)

    try {
      await fs.access(full_path)
      current_name = `${base_name}_${counter}.mp4`
      counter++
    }
    catch {
      return full_path
    }
  }
}

let generate_random_audio = async duration_seconds => {
  let sample_rate = 44100
  let num_samples = sample_rate * duration_seconds
  let samples = []

  let scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
  let bpm = 110 + Math.random() * 40
  let samples_per_beat = Math.floor(sample_rate * 60 / bpm / 4)
  let lead_phase = 0
  let lead_freq = 0
  let lead_amp = 0

  let textures = [
    {freq: 80, target_freq: 80, phase: 0, amp: 0, target_amp: 0.2},
    {freq: 220, target_freq: 220, phase: 0, amp: 0, target_amp: 0.15},
    {freq: 440, target_freq: 440, phase: 0, amp: 0, target_amp: 0.1}
  ]

  for (let current_sample = 0; current_sample < num_samples; current_sample++) {

    if (current_sample % samples_per_beat === 0) {

      if (Math.random() > 0.4) {
        lead_freq = scale[Math.floor(Math.random() * scale.length)]
        lead_amp = 0.4 + Math.random() * 0.4
      }
    }

    lead_amp *= 0.9994
    lead_phase += 2 * Math.PI * lead_freq / sample_rate

    if (lead_phase > 2 * Math.PI) {
      lead_phase -= 2 * Math.PI
    }

    if (current_sample % (sample_rate / 2) === 0) {
      textures[0].target_freq = 60 + Math.random() * 60
      textures[1].target_freq = 150 + Math.random() * 200
      textures[2].target_freq = 400 + Math.random() * 400
    }

    let texture_mix = 0

    for (let t of textures) {
      t.freq += (t.target_freq - t.freq) * 0.0004
      t.amp += (t.target_amp - t.amp) * 0.0001
      t.phase += 2 * Math.PI * t.freq / sample_rate

      if (t.phase > 2 * Math.PI) {
        t.phase -= 2 * Math.PI
      }
      texture_mix += Math.sin(t.phase) * t.amp
    }

    let noise = 0

    if (current_sample % samples_per_beat < 400) {
      noise = Math.random() * 0.05 * lead_amp
    }

    let final_signal = Math.sin(lead_phase) * lead_amp + texture_mix + noise

    samples.push(final_signal * 14000)
  }

  let wav = new WaveFile()
  wav.fromScratch(1, sample_rate, `16`, samples)
  let audio_path = path.join(get_dirname(), `bg_music.wav`)
  await fs.writeFile(audio_path, wav.toBuffer())

  return audio_path
}

let compile_html_to_video = async () => {
  let requested_path = process.argv[2]
  let final_output_path = await get_output_path(requested_path)

  let launch_args = [
    `--no-sandbox`,
    `--disable-setuid-sandbox`
  ]

  let browser = await puppeteer.launch({headless: true, args: launch_args})
  let page = await browser.newPage()
  await page.setViewport({width: 580, height: 880})

  let current_directory = get_dirname()
  let target_html = path.join(current_directory, `index.html`)
  let frames_directory = path.join(current_directory, `frames`)

  await fs.mkdir(frames_directory, {recursive: true})
  await page.goto(`file://${target_html}`)

  let duration_seconds = 10
  let interval_ms = 100
  let total_frames = duration_seconds * 1000 / interval_ms

  for (let current_frame = 0; current_frame < total_frames; current_frame++) {
    let start_time = Date.now()
    let frame_string = current_frame.toString().padStart(3, `0`)
    let file_path = path.join(frames_directory, `frame_${frame_string}.png`)

    await page.screenshot({path: file_path})

    let elapsed_time = Date.now() - start_time
    let time_to_wait = interval_ms - elapsed_time

    if (time_to_wait > 0) {
      await new Promise(resolve => setTimeout(resolve, time_to_wait))
    }
  }

  await browser.close()
  let audio_file = await generate_random_audio(duration_seconds)
  let frames_input = path.join(frames_directory, `frame_%03d.png`)
  let ffmpeg_cmd = `ffmpeg -framerate 10 -i ${frames_input} -i ${audio_file} -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest ${final_output_path}`

  exec(ffmpeg_cmd, async error => {
    if (error) {
      console.error(`failed to create video:`, error)
    }
    else {
      for (let i = 0; i < total_frames; i++) {
        let frame_string = i.toString().padStart(3, `0`)
        await fs.unlink(path.join(frames_directory, `frame_${frame_string}.png`))
      }

      await fs.rmdir(frames_directory)
      await fs.unlink(audio_file)
      console.log(final_output_path)
    }
  })
}

compile_html_to_video()