# ImageLite — Free Browser Image Compressor

A static single-page image compressor built with HTML, CSS, and vanilla JavaScript. It does not require an API key, database, or backend.

## Features
- Client-side image processing
- JPG, PNG, and WebP output options (subject to browser support)
- Quality control
- Optional maximum width and height
- Original and compressed previews, dimensions, and file sizes
- Drag-and-drop and file-picker upload
- Responsive layout and basic accessibility support
- 20 MB upload limit

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. For a more realistic local test, use VS Code with the Live Server extension or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## Deploy with GitHub + Vercel
1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, `README.md`, and `robots.txt`.
3. Import that repository into Vercel.
4. Use the default static deployment settings; no build command is needed.
5. After deployment, test the live URL on desktop and mobile.

## SEO setup
- Replace the placeholder domain in `sitemap.xml` with the final canonical URL before publishing the sitemap.
- Add the final domain to Google Search Console and verify ownership.
- Submit the sitemap after it contains the real URL.
- Do not claim search ranking or AdSense approval is guaranteed.

## Limitations
- Compression runs on the user's device; very large images can use significant memory.
- The tool is intended for still images. Animated images may lose animation during canvas conversion.
- Canvas conversion can strip metadata and may change color profiles.
- Lossy JPG/WebP output can reduce image quality.
- PNG output may not become smaller. The tool reports the actual result rather than promising savings.
- Output formats depend on browser support.
- This project does not include analytics, advertisements, a privacy policy page, or a contact form. Add those transparently if needed before monetization.
