// Names and TMDB (pure pieces): parseName's table of real-world-like file names (Spanish and English, made up, no
// owner data), the id markers, the caption override, the kino.meta query, merging an answer into a row, the poster URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installKino } from "../testkit/kino.mjs";

installKino();
const { parseName, markerOf, queryOf, applyMeta, posterOf, displayTitle, needsLookup, MISS_TTL_MS } = await import("../src/shell/enrich.js");

const NAMES = [
  ["The.Matrix.1999.1080p.BluRay.x264-SPARKS.mkv", { title: "The Matrix", year: 1999, type: "movie" }],
  ["Matrix {tmdb-603}.mp4", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Matrix (1999) {tmdb=603}.mkv", { title: "Matrix", year: 1999, type: "movie", tmdbId: 603 }],
  ["Matrix [tmdbid=603].mkv", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Matrix [tmdbid-603].mkv", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Matrix tmdb:603.mp4", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Matrix tmdbid603.mp4", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Matrix {tmdb-movie-603}.mp4", { title: "Matrix", type: "movie", tmdbId: 603 }],
  ["Game of Thrones {tmdb-tv-1399} S01E01.mkv", { title: "Game of Thrones", type: "series", season: 1, episode: 1, tmdbId: 1399 }],
  ["Juego.de.Tronos.S01E02.720p.WEB-DL.Latino.mkv", { title: "Juego de Tronos", type: "series", season: 1, episode: 2 }],
  ["El.Laberinto.del.Fauno.2006.BRRip.1080p.Castellano.mkv", { title: "El Laberinto del Fauno", year: 2006, type: "movie" }],
  ["Amélie (2001).mp4", { title: "Amélie", year: 2001, type: "movie" }],
  ["La_Casa_de_Papel_S02E05_1080p.mp4", { title: "La Casa de Papel", type: "series", season: 2, episode: 5 }],
  ["breaking bad 1x03.mkv", { title: "Breaking Bad", type: "series", season: 1, episode: 3 }],
  ["BREAKING BAD S05E14.mkv", { title: "Breaking Bad", type: "series", season: 5, episode: 14 }],
  ["1917.2019.2160p.UHD.BluRay.x265.mkv", { title: "1917", year: 2019, type: "movie" }],
  ["2012.mkv", { title: "2012", type: "movie" }],
  ["Blade Runner 2049 (2017) [1080p].mp4", { title: "Blade Runner 2049", year: 2017, type: "movie" }],
  ["[Grupo] Akira (1988) [BD 1080p HEVC].mkv", { title: "Akira", year: 1988, type: "movie" }],
  ["Coco.2017.Spanish.DVDRip.XviD.avi", { title: "Coco", year: 2017, type: "movie" }],
  ["Roma.2018.WEBRip.x264-ION10.mp4", { title: "Roma", year: 2018, type: "movie" }],
  ["Interstellar 2014 1080p WEB-DL DD5.1 H264-FGT.mkv", { title: "Interstellar", year: 2014, type: "movie" }],
  ["Spider-Man.No.Way.Home.2021.1080p.mkv", { title: "Spider-Man No Way Home", year: 2021, type: "movie" }],
  ["El Señor de los Anillos - La Comunidad del Anillo (2001) Extended.mkv", { title: "El Señor de los Anillos - La Comunidad del Anillo", year: 2001, type: "movie" }],
  ["Dark.S03E08.Latino.1080p.mkv", { title: "Dark", type: "series", season: 3, episode: 8 }],
  ["Narcos Temporada 2 Capitulo 4.mp4", { title: "Narcos", type: "series", season: 2, episode: 4 }],
  ["Friends.S10E17-E18.mkv", { title: "Friends", type: "series", season: 10, episode: 17 }],
  ["Toy Story 4 (2019) 4K HDR Dual Latino.mkv", { title: "Toy Story 4", year: 2019, type: "movie" }],
  ["pelicula.mp4", { title: "Pelicula", type: "movie" }],
  ["The Office (US) S02E01.mkv", { title: "The Office (US)", type: "series", season: 2, episode: 1 }],
  ["Avengers.Endgame.2019.MULTi.2160p.UHD.BluRay.x265-SESKAPiLE.mkv", { title: "Avengers Endgame", year: 2019, type: "movie" }],
  ["Parasite.2019.KOREAN.1080p.BluRay.x264.mkv", { title: "Parasite", year: 2019, type: "movie" }],
  ["Cómo entrenar a tu dragón (2010).mkv", { title: "Cómo entrenar a tu dragón", year: 2010, type: "movie" }],
  ["La.Vida.Es.Bella.1997.ITA.SUB.ESP.mkv", { title: "La Vida Es Bella", year: 1997, type: "movie" }],
  ["Mi viaje a Cartagena.mp4", { title: "Mi viaje a Cartagena", type: "movie" }],
  ["screen-recording-2024-03-05.mp4", { title: "Screen-recording-2024-03-05", type: "movie" }],
  ["Doctor.Who.2005.S01E01.mkv", { title: "Doctor Who", year: 2005, type: "series", season: 1, episode: 1 }],
  ["Charlotte's Web (2006).mp4", { title: "Charlotte's Web", year: 2006, type: "movie" }],
  ["LA CASA DE PAPEL T1E3.mp4", { title: "La Casa de Papel", type: "series", season: 1, episode: 3 }],
];

test("parseName: " + NAMES.length + " real-world-like names (markers, release tags, years, SxxExx, accents, casing)", () => {
  assert.ok(NAMES.length >= 30);
  for (const [name, want] of NAMES) assert.deepEqual(parseName(name, ""), want, name);
});

test("the caption: its marker wins over the name's, and it names a video whose file name is a camera's or missing", () => {
  assert.deepEqual(parseName("Matrix.mp4", "tmdb:603"), { title: "Matrix", type: "movie", tmdbId: 603 });
  assert.deepEqual(parseName("Wrong.Title.2010.mkv", "Mira esto\nhttps://www.themoviedb.org/movie/27205-inception"), { title: "Wrong Title", year: 2010, type: "movie", tmdbId: 27205 });
  assert.deepEqual(parseName("Serie X.mkv", "themoviedb.org/tv/1399"), { title: "Serie X", type: "series", tmdbId: 1399 });
  assert.deepEqual(parseName("Matrix {tmdb-1}.mp4", "{tmdb-603}"), { title: "Matrix", type: "movie", tmdbId: 603 });
  assert.deepEqual(parseName("VID_20240101_123456.mp4", "Cumpleaños de la abuela\nsegunda línea"), { title: "Cumpleaños de la abuela", type: "movie" });
  assert.deepEqual(parseName("", "Coco (2017)"), { title: "Coco", year: 2017, type: "movie" });
  assert.deepEqual(parseName("IMG_4411.MOV", ""), { title: "Img 4411", type: "movie" });
  assert.deepEqual(parseName("video.mp4", "tmdb:tv:1399"), { title: "Video", type: "series", tmdbId: 1399 });
});

test("markers: every documented form, ids bounded to TMDB's range, no marker inside another word", () => {
  for (const s of ["{tmdb-603}", "{tmdb=603}", "[tmdbid=603]", "[tmdbid-603]", "tmdb:603", "tmdbid603", "TMDB:603"]) {
    assert.deepEqual(markerOf(s), { id: 603 }, s);
  }
  for (const s of ["themoviedb.org/movie/603", "https://www.themoviedb.org/es/movie/603-matrix", "https://www.themoviedb.org/es-MX/movie/603"]) assert.deepEqual(markerOf(s), { id: 603, type: "movie" }, s);
  assert.deepEqual(markerOf("{tmdb-tv-1399}"), { id: 1399, type: "series" });
  assert.deepEqual(markerOf("https://www.themoviedb.org/tv/1399?language=es"), { id: 1399, type: "series" });
  assert.deepEqual(markerOf("{tmdb-movie-603}"), { id: 603, type: "movie" });
  for (const s of ["xtmdb:603", "tmdb:0", "tmdb:99999999999", "tmdb", "", null, "atmdbid603"]) assert.equal(markerOf(s), null, String(s));
});

test("queryOf: an id marker asks by id; otherwise by title (and year) only where Kino answers by title", () => {
  assert.deepEqual(queryOf({ title: "Matrix", type: "movie", tmdbId: 603 }, true), { type: "movie", ids: { tmdb: 603 } });
  assert.deepEqual(queryOf({ title: "The Matrix", year: 1999, type: "movie" }, true), { type: "movie", title: "The Matrix", year: 1999 });
  assert.deepEqual(queryOf({ title: "Dark", type: "series", season: 3, episode: 8 }, true), { type: "series", title: "Dark" });
  assert.equal(queryOf({ title: "The Matrix", type: "movie" }, false), null, "older Kino: no lookup by title");
  assert.equal(queryOf({ title: "", type: "movie" }, true), null);
  assert.equal(queryOf({ title: "x".repeat(201), type: "movie" }, true).title.length, 200);
});

const ROW = { id: "-1001:7", title: "The.Matrix.1999.1080p", sort: 5, data: { chatId: "-1001", msgId: 7, size: 10, n: { title: "The Matrix", year: 1999, type: "movie" }, pk: "movie|the matrix|1999" } };
const MATRIX = { title: "Matrix", overview: "x".repeat(400), year: "1999", poster: "https://image.tmdb.org/t/p/w500/hEpWvX6Bp79eLxY1kX5ZZJcme5U.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/icmmSD4vTTDKOq2vvdulafOGw93.jpg", ids: { tmdb: 603, imdb: "tt0133093" }, cast: [{ name: "A" }], genres: ["Acción"] };

test("applyMeta: a hit keeps a small record (poster path, title, year, 160 characters of overview, tmdb id) and the title searchable both ways", () => {
  const now = 1_800_000_000_000;
  const r = applyMeta(ROW, MATRIX, now);
  assert.deepEqual(r.data.tm, { at: now, id: 603, t: "Matrix", y: "1999", o: "x".repeat(160), p: "/hEpWvX6Bp79eLxY1kX5ZZJcme5U.jpg", b: "/icmmSD4vTTDKOq2vvdulafOGw93.jpg" });
  assert.equal(r.sort, 5);
  assert.equal(r.id, ROW.id);
  assert.match(r.title, /Matrix/);
  assert.match(r.title, /The Matrix/);
  assert.match(r.title, /1080p/, "the original file name stays searchable");
  assert.ok(r.title.length <= 300);
  assert.ok(JSON.stringify(r.data).length < 4096);
  assert.equal(displayTitle(r.data, r.title), "Matrix");
  assert.deepEqual(posterOf(r), "https://image.tmdb.org/t/p/w342/hEpWvX6Bp79eLxY1kX5ZZJcme5U.jpg");
  assert.equal(needsLookup(r, now + 365 * 86400000), false, "a hit is never asked again");
});

test("applyMeta: a miss is a negative record that expires; a poster that is not TMDB's is not kept", () => {
  const now = 1_800_000_000_000;
  const miss = applyMeta(ROW, null, now);
  assert.deepEqual(miss.data.tm, { at: now, miss: true });
  assert.equal(miss.title, ROW.title);
  assert.equal(needsLookup(miss, now + 1000), false);
  assert.equal(needsLookup(miss, now + MISS_TTL_MS + 1), true);
  assert.equal(needsLookup(ROW, now), true);
  assert.equal(displayTitle(miss.data, miss.title), "The Matrix");
  const odd = applyMeta(ROW, { title: "Matrix", poster: "https://example.com/p.jpg", ids: { tmdb: 603 } }, now);
  assert.equal(odd.data.tm.p, undefined);
  assert.equal(posterOf(odd), null);
});

test("displayTitle: an episode keeps its SxxExx after the show's name", () => {
  const data = { n: { title: "Dark", type: "series", season: 3, episode: 8 } };
  assert.equal(displayTitle(data, "Dark.S03E08"), "Dark S03E08");
  assert.equal(displayTitle({ ...data, tm: { at: 1, id: 70523, t: "Dark (es)" } }, "x"), "Dark (es) S03E08");
  assert.equal(displayTitle({}, "Raw title"), "Raw title");
});
