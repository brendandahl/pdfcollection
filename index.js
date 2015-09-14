var PdfCollection = (function() {

  var pdfsDiv = null;

  var thumbnailChain = Promise.resolve();
  var thumbnailWidth;

  function buildThumbnail(url) {
    PDFJS.disableStream = true;
    PDFJS.disableAutoFetch = true;
    return PDFJS.getDocument(url).then(function getPdfHelloWorld(pdf) {
      return pdf.getPage(1).then(function getPageHelloWorld(page) {
        var viewport = page.getViewport(1);
        var scale = (196 / viewport.width);
        viewport = viewport.clone({scale: scale});

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        return page.render(renderContext).then(function() {
          pdf.destroy();
          return canvasToBlob(canvas);
        });
      });
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(resolve);
    });
  }

  function cacheThumbnail(url, blob) {
    return caches.open('previews').then(function(cache) {
      return cache.put(url, new Response(blob, {
        headers: { "Content-Type" : "image/png" }
      }));
    });
  }

  function setThumbnail(thumbnailDiv, url) {
    thumbnailDiv.style.backgroundImage = 'url(' + url + ')';
  }

  function setupOffline(pdf, makeOfflineDiv) {
    if (typeof CacheStorage === "undefined") {
      makeOfflineDiv.style.display = 'none';
      return;
    }
    var checkBox = makeOfflineDiv.querySelector('input[type="checkbox"]');
    checkBox.addEventListener('click', function() {
      if (checkBox.checked) {
        fetch(pdf.filename).then(function(response) {
          return caches.open('pdfs').then(function(cache) {
            return cache.put(pdf.filename, response);
          });
        });
      } else {
        caches.open('pdfs').then(function(cache) {
          return cache.delete(pdf.filename);
        });
      }
    });

    caches.match(pdf.filename).then(function(response) {
      if (!response) {
        return;
      }
      checkBox.checked = true;
    });
  }

  function setupThumbnail(pdf, thumbnailDiv) {
    var thumbnailUrl = pdf.filename + '.png';
    caches.match(thumbnailUrl).then(function(response) {
      if (!response) {
        // Only one pdf at a time can be rendered, so chain them all together.
        thumbnailChain = thumbnailChain.then(function() {
          return buildThumbnail(pdf.filename).then(function(blob) {
            setThumbnail(thumbnailDiv, URL.createObjectURL(blob));
            cacheThumbnail(thumbnailUrl, blob);
          });
        });
        return;
      }
      setThumbnail(thumbnailDiv, thumbnailUrl);
    });
  }

  function addPdfs(pdfs) {
    pdfs.forEach(function(pdf) {
      var pdfDiv = document.querySelector('#fragments .pdf').cloneNode(true);
      pdfDiv.querySelector('.title').textContent = pdf.title;
      pdfDiv.querySelector('.thumbnail').href = 'external/pdf.js/web/viewer.html?file=../../../' + pdf.filename;

      setupOffline(pdf, pdfDiv.querySelector('.offline'));

      setupThumbnail(pdf, pdfDiv.querySelector('.thumbnailImage'));

      pdfsDiv.appendChild(pdfDiv);
    });
  }

  function init(options) {
    thumbnailWidth = document.querySelector(".thumbnailImage").offsetWidth;
    pdfsDiv = document.getElementById('pdfs');
    addPdfs(options.pdfs);
  }

  return {
    init: init
  };
})();

if (navigator.serviceWorker) {
  navigator.serviceWorker.register('sw.js').then(function(registration) {
    // Registration was successful
    registration.update();
    console.log('ServiceWorker registration successful with scope: ',    registration.scope);
  }).catch(function(err) {
    console.log('ServiceWorker registration failed: ', err);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  PdfCollection.init({
    pdfs: [
      {
        title: 'Trace-based Just-in-Time Type Specialization for Dynamic Languages',
        filename: 'pdfs/compressed.tracemonkey-pldi-09.pdf'
      },
      {
        title: 'Constructing SSA the Easy Way',
        filename: 'pdfs/2011111194228679531.pdf'
      },
      {
        title: 'Trace-Based Compilation and Optimization in Meta-Circular Virtual Execution Environments',
        filename: 'pdfs/bebenita-dissertation.pdf'
      },
      {
        title: 'Implementing Fast JVM Interpreters Using Java Itself',
        filename: 'pdfs/BebenitaGalFranz_JavainJava.pdf'},
      {
        title: 'HPar: A Practical Parallel Parser for HTML–Taming HTMLComplexities for Parallel Parsing',
        filename: 'pdfs/hpar.pdf'
      },
      {
        title: 'SPUR: A Trace-Based JIT Compiler for CIL',
        filename: 'pdfs/techreport2.pdf'
      },
    ]
  });
}, true);

// Helper to rest to a clean state.
function reset() {
  function clearCache() {
    return caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        return caches.delete(key);
      }));
    });
  }
  clearCache().then(function() {
    return navigator.serviceWorker.ready;
  }).then(function(registration) {
    return registration.unregister();
  }).then(function() {
    window.location.reload(true);
  });
}

// For now I'll be lazy and disable bfcache so the images reload.
window.addEventListener("beforeunload", function (event) {});
