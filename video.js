import path from "path"
import puppeteer from "puppeteer"
import {exec} from "child_process"
import fs from "fs/promises"

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

  let duration_ms = 10 * 1000
  let interval_ms = 100
  let total_frames = duration_ms / interval_ms

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
  let ffmpeg_cmd = `ffmpeg -framerate 10 -i frames/frame_%03d.png -c:v libx264 -pix_fmt yuv420p ${output_path}`

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
      console.log(`cleaned up frames directory`)
    }
  })
}

compile_html_to_video()