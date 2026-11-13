/* Serves the app's /api/* requests from window.CLOSET_DATA (data.js), so the site runs without a server. */
(function () {
  var data = window.CLOSET_DATA || {};
  var tones = ["#cdbfa8", "#b49a78", "#8c6f50", "#6b5440", "#d8d2c6", "#9a8f80", "#5c5249", "#c4b49a"];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function placeholder(title, sub, seed, w, h, smoked) {
    w = w || 1600; h = h || 1067;
    var bg = tones[seed % tones.length];
    var glass = smoked ? "rgba(40,38,36,.55)" : "rgba(255,255,255,.28)";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/>' +
      '<g fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3">' +
      '<rect x="' + w * 0.12 + '" y="' + h * 0.12 + '" width="' + w * 0.76 + '" height="' + h * 0.76 + '"/>' +
      '<line x1="' + w * 0.37 + '" y1="' + h * 0.12 + '" x2="' + w * 0.37 + '" y2="' + h * 0.88 + '"/>' +
      '<line x1="' + w * 0.63 + '" y1="' + h * 0.12 + '" x2="' + w * 0.63 + '" y2="' + h * 0.88 + '"/></g>' +
      '<rect x="' + (w * 0.37 + 2) + '" y="' + (h * 0.12 + 2) + '" width="' + (w * 0.26 - 4) + '" height="' + (h * 0.76 - 4) + '" fill="' + glass + '"/>' +
      '<rect x="' + w * 0.25 + '" y="' + h * 0.42 + '" width="' + w * 0.5 + '" height="' + h * 0.16 + '" rx="6" fill="rgba(25,27,25,.78)"/>' +
      '<text x="50%" y="' + h * 0.49 + '" text-anchor="middle" font-family="Georgia,serif" font-size="' + Math.round(h * 0.045) + '" fill="#f4efe6">' + esc(title) + "</text>" +
      '<text x="50%" y="' + h * 0.545 + '" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="' + Math.round(h * 0.024) + '" letter-spacing="2" fill="#c9c1b3">' + esc(sub.toUpperCase()) + "</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function finishCatalog(key) {
    return (data[key] || []).map(function (f, i) {
      return {
        id: f.id, collection: f.collection, name: f.name, note: f.note || "",
        thumbnails: {
          clear: (f.thumbs && f.thumbs.clear) || f.images.clear || placeholder(f.name, f.collection + " · clear glass", i, 640, 480, false),
          smoked: (f.thumbs && f.thumbs.smoked) || f.images.smoked || placeholder(f.name, f.collection + " · smoked glass", i, 640, 480, true)
        }
      };
    });
  }

  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), { status: status || 200, headers: { "Content-Type": "application/json" } }));
  }

  function route(path) {
    var m;
    if ((m = path.match(/^\/api\/(walls-1-and-6|wall-2)\/catalog$/))) return json(finishCatalog(m[1]));
    if ((m = path.match(/^\/api\/(walls-1-and-6|wall-2)\/image\/([^/]+)\/(clear|smoked)$/))) {
      var list = data[m[1]] || [], idx = list.findIndex(function (f) { return f.id === m[2]; });
      var f = list[idx];
      if (!f) return json({ message: "Not found" }, 404);
      var wall = m[1] === "wall-2" ? "Wall 2" : "Walls 1 & 6";
      return json({ src: f.images[m[3]] || placeholder(f.name, wall + " · " + f.collection + " · " + m[3] + " glass", idx, 1600, 1067, m[3] === "smoked") });
    }
    var md = data["master-design"] || { sheets: [] };
    if (path === "/api/master-design/catalog") {
      return json(md.sheets.map(function (s, i) {
        return { id: s.id, title: s.title, thumbnail: s.thumb || s.image || placeholder("Sheet " + (i + 1), s.title, i + 3, 640, 452) };
      }));
    }
    if ((m = path.match(/^\/api\/master-design\/image\/([^/]+)$/))) {
      var si = md.sheets.findIndex(function (s) { return s.id === m[1]; }), s = md.sheets[si];
      if (!s) return json({ message: "Not found" }, 404);
      return json({ src: s.image || placeholder("Sheet " + (si + 1), s.title + " · drawing to come", si + 3, 1700, 1200) });
    }
    // Picture galleries: Salice accessories and Shinnoki samples share one shape.
    if ((m = path.match(/^\/api\/(accessories|samples|aluminum|doorshape|inspiration)$/))) {
      var list = data[m[1]] || [];
      return json(list.map(function (a, i) {
        return { id: a.id, title: a.title, description: a.description || "", thumbnail: a.thumb || a.image || placeholder(a.title, m[1] === "samples" ? "Shinnoki" : "Salice", i + 5, 640, 480) };
      }));
    }
    if ((m = path.match(/^\/api\/(accessories|samples|aluminum|doorshape|inspiration)\/([^/]+)\/image$/))) {
      var items = data[m[1]] || [];
      var ai = items.findIndex(function (a) { return a.id === m[2]; }), a = items[ai];
      if (!a) return json({ message: "Not found" }, 404);
      return json({ src: a.image || placeholder(a.title, "Photo to come", ai + 5, 1600, 1200) });
    }
    return null;
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var path;
    try { path = new URL(url, location.href).pathname; } catch (e) { path = url; }
    var i = path.indexOf("/api/");
    if (i !== -1) {
      var res = route(path.slice(i));
      if (res) return res;
      return json({ message: "Not found" }, 404);
    }
    return realFetch(input, init);
  };

  // The "Original PDF" link: open the real file in a new tab (downloads are blocked in the viewer).
  var md = data["master-design"];
  function fixPdfLinks() {
    var links = document.querySelectorAll('a[href*="/api/master-design/document"]');
    for (var k = 0; k < links.length; k++) {
      if (md && md.pdf) {
        links[k].href = new URL(md.pdf, location.href).href;
        links[k].removeAttribute("download");
        links[k].target = "_blank";
        links[k].rel = "noopener";
      } else {
        links[k].hidden = true;
      }
    }
  }
  new MutationObserver(fixPdfLinks).observe(document.documentElement, { childList: true, subtree: true });
})();
