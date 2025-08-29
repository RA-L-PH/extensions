# Advanced Font Changer

A Chrome extension that forces a chosen Google Font on all websites with an intuitive category-based selection interface.

## Features

- **Category-based Font Selection**: Choose from Sans-Serif, Serif, Monospace, Dyslexia-Friendly, and Funky fonts
- **Google Fonts Integration**: Dynamically loads fonts from Google Fonts API
- **Persistent Settings**: Remembers your font choice across browser sessions
- **Shadow DOM Support**: Works with modern web components and shadow roots
- **Ad/Tracking Frame Protection**: Skips injection into known ad and tracking domains
- **Sticky Font Preview**: Large, sticky preview that stays visible while browsing fonts
- **Icon Font Control**: Optional inclusion of icon fonts (Font Awesome, Material Icons, etc.)

## Icon Font Support

The extension can optionally affect icon fonts used on websites:

- **Text Icons**: Font-based icons (Font Awesome, Material Icons, Glyphicons, etc.) can be changed
- **SVG Icons**: Vector-based icons are not affected (by design, as they're not font-based)
- **Image Icons**: Background image icons are not affected
- **Control Option**: Toggle "Include Icons & Symbols" to control this behavior

**Note**: Icon fonts will only change if they're loaded from Google Fonts or use standard web font loading. Custom icon fonts may not be affected.

## Included Fonts

### Sans-Serif Fonts

- Open Sans
- Roboto
- Lato
- Montserrat
- Poppins
- Inter
- Nunito Sans
- Source Sans 3
- Work Sans
- Manrope
- Fira Sans
- IBM Plex Sans
- Ubuntu
- DM Sans
- Karla

### Serif Fonts

- Merriweather
- Libre Baskerville
- Lora
- PT Serif
- Noto Serif
- Cormorant Garamond
- Alegreya
- Arvo
- Bitter
- Crimson Text
- Playfair Display
- Roboto Slab
- Zilla Slab
- Slabo 27px
- EB Garamond

### Monospace & Display Fonts

- Comfortaa
- Roboto Mono
- Space Mono
- Source Code Pro
- Courier Prime
- Inconsolata
- JetBrains Mono
- Fira Code
- Lekton
- Cousine
- Anonymous Pro
- Syne Mono
- VT323
- Share Tech Mono
- Special Elite

### Dyslexia-Friendly & Accessible Fonts

- Lexend
- Atkinson Hyperlegible
- OpenDyslexic
- Sora
- Proza Libre
- Quattrocento Sans
- Nunito
- Comic Sans
- Hind
- Merriweather Sans
- Inter
- Noto Sans
- IBM Plex Sans
- Arial
- Verdana

### Funky Fonts

- Permanent Marker
- Bungee
- Lobster
- Pacifico
- Luckiest Guy
- Fredericka the Great
- Press Start 2P
- Monoton
- Black Ops One
- Alfa Slab One
- Coda
- Gochi Hand
- Rubik Beastly
- Amatic SC
- Titan One

## Font Summary

Your extension now includes:

- **15 Sans-Serif Fonts**
- **15 Serif Fonts**
- **15 Monospace & Display Fonts**
- **15 Dyslexia-Friendly & Accessible Fonts**
- **15 Funky Fonts**

**Total: 75 fonts** across all categories!

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `advanced-font-changer` folder
5. The extension should now appear in your extensions list

## Usage

1. Click the extension icon in your Chrome toolbar
2. Select a font category from the dropdown or browse the available fonts
3. Click on your desired font to select it
4. Toggle "Include Icons & Symbols" if you want to affect icon fonts
5. Click "Apply Font" to apply the changes
6. The font will be applied to all websites you visit

**Icon Control**: The "Include Icons & Symbols" option controls whether font-based icons (like Font Awesome, Material Icons) are also changed. SVG icons and image-based icons are not affected.

## How It Works

The extension injects CSS rules that override the `font-family` property on all elements, ensuring your chosen font takes precedence over website-specific fonts. It also loads the Google Font dynamically to ensure proper rendering.

## Permissions

- `storage`: To save your font preference
- `activeTab`: To apply fonts to the current tab
- `https://fonts.googleapis.com/*`: To load Google Fonts

## Technical Details

- Uses Manifest V3
- Content scripts run at document start for optimal performance
- Handles dynamic content and shadow DOMs
- Skips injection into ad/tracking frames to avoid conflicts

## Contributing

Feel free to submit issues or pull requests with additional font suggestions or improvements.
