
// Debug: indicate the content script has loaded and report runtime id (if available)
try {
	console.log('[trump-tweet] content script loaded', { extId: (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ? chrome.runtime.id : null, time: new Date().toISOString() });
} catch (e) {
	console.log('[trump-tweet] content script loaded (logging failed)', e);
}

// Capture global errors to help identify origin of blocked/failed scripts
window.addEventListener('error', function(ev) {
	try {
		console.warn('[trump-tweet] window error', { filename: ev.filename, message: ev.message, lineno: ev.lineno, colno: ev.colno, error: ev.error && ev.error.stack });
	} catch (e) {
		console.warn('[trump-tweet] window error (logger failed)', e);
	}
});

window.addEventListener('unhandledrejection', function(ev) {
	try {
		console.warn('[trump-tweet] unhandledrejection', ev.reason);
	} catch (e) {
		console.warn('[trump-tweet] unhandledrejection (logger failed)', e);
	}
});

var fa = document.createElement('style');
    fa.type = 'text/css';
    fa.textContent = '@font-face { font-family: i eat crayons; src: url("'
	+ chrome.runtime.getURL('fonts/i eat crayons.ttf')
        + '"); }';
document.head.appendChild(fa);
var getUrl = (typeof chrome !== 'undefined' && (chrome.runtime && chrome.runtime.getURL)) ? chrome.runtime.getURL.bind(chrome.runtime) : function(p){ return p; };
// ensure the font path is URL-encoded for spaces
var fontPath = getUrl('fonts/i eat crayons.ttf');
fontPath = fontPath.replace(/ /g, '%20');
fa.textContent = "@font-face { font-family: 'i eat crayons'; src: url('" + fontPath + "'); }";
document.head.appendChild(fa);
// Add MessyHandwritten font for /narendramodi
var fa2 = document.createElement('style');
fa2.type = 'text/css';
// Use the OpenType (.otf) file for VanillaCreamOx and declare format for better compatibility
var vanillaPath = getUrl('fonts/VanillaCreamOx-Regular.otf');
vanillaPath = vanillaPath.replace(/ /g, '%20');
fa2.textContent = "@font-face { font-family: 'VanillaCreamOx'; src: url('" + vanillaPath + "') format('opentype'); font-display: swap; }";
document.head.appendChild(fa2);
// Add BLKCHCRY font for all other accounts
var fa3 = document.createElement('style');
fa3.type = 'text/css';
var blkPath = getUrl('fonts/OceanTrace.TTF');
blkPath = blkPath.replace(/ /g, '%20');
fa3.textContent = "@font-face { font-family: 'oceantrace'; src: url('" + blkPath + "') format('truetype'); font-display: swap; }";
document.head.appendChild(fa3);
function changeFont(){
	// New approach: scan article elements and look for the user's link (robust against DOM changes)
	var articles = document.querySelectorAll('article');
	var modified = 0;
	articles.forEach(function(article, idx) {
		try {
			// Check whether this article belongs to Trump or Narendra (or neither)
			var isTrump = !!article.querySelector('a[href*="/realDonaldTrump"], a[href$="/realDonaldTrump"]');
			var isNarendra = !!article.querySelector('a[href*="/narendramodi"], a[href$="/narendramodi"]');
			// Tweet text containers vary; prefer data-testid when present, fall back to any div[lang]
			var tweetNodes = article.querySelectorAll('div[data-testid="tweetText"], div[lang]');
			tweetNodes.forEach(function(t) {
				try {
					if (isNarendra) {
						t.style.fontFamily = "'VanillaCreamOx', sans-serif";
						t.style.color = '#52a9ffff';
						t.style.fontSize = '24px';
					} else if (isTrump) {
						t.style.fontFamily = "'i eat crayons', sans-serif";
						t.style.color = '#ff5858ff';
						t.style.fontSize = '24px';
					} else {
						// default for other accounts
						t.style.fontFamily = "'oceantrace', sans-serif";
						t.style.color = '#c0c0c0ff';
						t.style.fontSize = '16px';
					}
					modified++;
				} catch (e) {
					console.warn('[trump-tweet] failed to style a tweet node', e);
				}
			});
		} catch (e) {
			console.warn('[trump-tweet] changeFont error for article index', idx, e);
		}
	});
	if (modified) console.log('[trump-tweet] modified tweets count', modified);
}
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var observer = new MutationObserver(function(mutations, observer) {
    // fired when a mutation occurs
	console.log('[trump-tweet] MutationObserver fired', mutations.length);
	changeFont();
    // ...
});
// define what element should be observed by the observer
// and what types of mutations trigger the callback
observer.observe(document, {
  subtree: true,
  attributes: true
  //...
});