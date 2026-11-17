import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addFiles,
  fromDraftSaved,
  fromSavedPaths,
  MAX_PHOTOS,
  ownedBy,
  safeFileName,
  storagePath,
  toDraftSaved,
  TOO_BIG,
  tooMany,
  uploadedPaths,
  uploadErrorText,
  uploadsSummary,
  type UploadItem,
} from "./intake-uploads";

const USER = "11111111-2222-4333-8444-555555555555";
const FILE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SESSION = "cs_test_a1B2c3";

let n = 0;
const ids = () => `0000000${++n}`.slice(-8).padEnd(8, "0").replace(/^(.{8})$/, "$1-0000-4000-8000-000000000000");
const photo = (name: string, size = 1000) => new File([new Uint8Array(size)], name, { type: "image/jpeg" });

describe("Adding files", () => {
  it("keeps up to 20 photos across several picks, never the same photo twice, and says how many didn't fit", () => {
    const first = addFiles([], [photo("a.jpg"), photo("b.jpg")], "photo", ids);
    assert.equal(first.items.length, 2);
    const again = addFiles(first.items, [photo("b.jpg"), photo("c.jpg")], "photo", ids);
    assert.deepEqual(again.items.map((i) => i.name), ["a.jpg", "b.jpg", "c.jpg"]);
    assert.equal(again.added, 1);
    const many = Array.from({ length: 25 }, (_, i) => photo(`p${i}.jpg`));
    const full = addFiles(again.items, many, "photo", ids);
    assert.equal(full.items.length, MAX_PHOTOS);
    assert.equal(full.skipped, 8);
    assert.match(tooMany(MAX_PHOTOS), /Only 20 files/);
  });

  it("the CP-575 is one file: a new pick replaces it", () => {
    const one = addFiles([], [photo("letter.pdf")], "cp575", ids);
    const two = addFiles(one.items, [photo("letter-2.pdf"), photo("extra.pdf")], "cp575", ids);
    assert.deepEqual(two.items.map((i) => i.name), ["letter-2.pdf"]);
    assert.equal(two.skipped, 1);
  });

  it("a file that isn't a picture and is over 25 MB is refused at once; a big photo waits to be shrunk", () => {
    const huge = new File([new Uint8Array(10)], "scan.pdf", { type: "application/pdf" });
    Object.defineProperty(huge, "size", { value: 30 * 1024 * 1024 });
    const bigPhoto = new File([new Uint8Array(10)], "IMG_1.HEIC", { type: "" });
    Object.defineProperty(bigPhoto, "size", { value: 30 * 1024 * 1024 });
    const r = addFiles([], [huge, bigPhoto], "photo", ids);
    assert.deepEqual(r.items.map((i) => [i.status, i.error ?? null]), [["error", TOO_BIG], ["waiting", null]]);
  });
});

describe("Where a file goes in storage", () => {
  it("is the user's folder, the session, then a folder of its own, with a tidy name", () => {
    assert.equal(storagePath(USER, SESSION, { id: FILE_ID, kind: "photo" }, "Fachada principal (1).jpg"), `${USER}/${SESSION}/${FILE_ID}/Fachada_principal_1.jpg`);
    assert.equal(storagePath(USER, "", { id: FILE_ID, kind: "cp575" }, "CP 575.pdf"), `${USER}/returning/${FILE_ID}/cp575-CP_575.pdf`);
  });

  it("names stay readable, keep their extension and never pass 60 characters", () => {
    assert.equal(safeFileName("  фото.jpg"), "file.jpg", "a name with no usable letters still keeps its extension");
    assert.equal(safeFileName("Baño antes y después.JPG"), "Ba_o_antes_y_despu_s.JPG");
    const long = safeFileName(`${"a".repeat(100)}.jpeg`);
    assert.ok(long.length <= 60 && long.endsWith(".jpeg"));
    assert.ok(!safeFileName("..hidden").startsWith("."), "never a hidden file");
    assert.equal(safeFileName("!!!"), "file");
  });
});

describe("Remembering uploads", () => {
  const done = (id: string, kind: "photo" | "cp575", name: string, user = USER): UploadItem => ({
    id,
    kind,
    name,
    size: 0,
    type: "",
    status: "done",
    path: storagePath(user, SESSION, { id, kind }, name),
    tries: 1,
  });

  it("a tab remembers its uploaded files; a user only sees their own", () => {
    const items = [done(FILE_ID, "photo", "a.jpg"), { ...done(FILE_ID.replace("a", "b"), "photo", "b.jpg"), status: "uploading" as const }];
    const saved = JSON.parse(JSON.stringify(items.filter((i) => i.status === "done").map((i) => i.path))) as unknown;
    const back = fromSavedPaths(saved, null, SESSION);
    assert.deepEqual(back.map((i) => [i.id, i.name, i.status]), [[FILE_ID, "a.jpg", "done"]]);
    assert.deepEqual(fromSavedPaths(saved, "other-user", SESSION), []);
    assert.deepEqual(fromSavedPaths(saved, USER, "cs_test_other"), [], "another checkout's files aren't this one's");
    const live = `${USER}/cs_live_x9Y8z7/${FILE_ID}/a.jpg`;
    assert.deepEqual(fromSavedPaths([live], USER, "cs_live_x9Y8z7").map((i) => i.path), [live], "a live checkout's files are remembered too");
    assert.deepEqual(ownedBy(back, "someone-else"), []);
  });

  it("the saved draft keeps the paths without the user's folder, and gives them back", () => {
    const items = [done(FILE_ID, "photo", "a.jpg"), done(FILE_ID.replace("a", "c"), "cp575", "CP575.pdf")];
    const value = toDraftSaved(items, USER, SESSION);
    assert.ok(value.length < 400, `short enough for the draft: ${value.length}`);
    assert.ok(!value.includes(USER));
    const back = fromDraftSaved(value, USER, SESSION);
    assert.deepEqual(back.map((i) => [i.kind, i.name]), [["photo", "a.jpg"], ["cp575", "CP575.pdf"]]);
    const other = USER.replace("1111", "9999");
    assert.deepEqual(fromDraftSaved(value, other, SESSION).map((i) => i.path?.startsWith(`${other}/`)), [true, true], "restored for whoever the draft belongs to");
    assert.deepEqual(fromDraftSaved("not json", USER, SESSION), []);
    assert.deepEqual(fromDraftSaved(JSON.stringify(["../../etc/passwd", `${FILE_ID}/ok.jpg`]), USER, SESSION).map((i) => i.name), ["ok.jpg"]);
  });

  it("what's sent: the photos in order, then the CP-575", () => {
    const items = [done(FILE_ID.replace("a", "c"), "cp575", "letter.pdf"), done(FILE_ID, "photo", "a.jpg"), done(FILE_ID.replace("a", "b"), "photo", "b.jpg")];
    assert.deepEqual(uploadedPaths(items).map((p) => p.split("/").pop()), ["a.jpg", "b.jpg", "cp575-letter.pdf"]);
  });
});

describe("What a failed upload says", () => {
  it("reads as plain English and knows when a retry can help", () => {
    assert.deepEqual(uploadErrorText("new row violates row-level security policy for table \"objects\""), { text: "Confirm your account email at the bottom of the form, then tap Retry.", retryable: false });
    assert.equal(uploadErrorText("Payload too large").text, TOO_BIG);
    assert.equal(uploadErrorText("TypeError: Failed to fetch").retryable, true);
    assert.equal(uploadErrorText("The resource already exists").alreadyThere, true);
  });

  it("the line under the list counts what's added, uploaded and failed", () => {
    const base = { size: 0, type: "", tries: 0 };
    const items: UploadItem[] = [
      { id: "1", kind: "photo", name: "a.jpg", status: "done", ...base },
      { id: "2", kind: "photo", name: "b.jpg", status: "waiting", ...base },
      { id: "3", kind: "photo", name: "c.jpg", status: "error", error: "x", ...base },
      { id: "4", kind: "cp575", name: "l.pdf", status: "done", ...base },
    ];
    assert.equal(uploadsSummary(items, "photo", true), "3 of 20 added · 1 uploaded · 1 didn’t upload");
    assert.equal(uploadsSummary(items, "photo", false), "3 of 20 added · 1 uploaded · 1 didn’t upload · the rest upload once your email is confirmed (bottom of the form)");
    assert.equal(uploadsSummary(items, "cp575", true), "1 uploaded");
    assert.equal(uploadsSummary([], "photo", true), "");
  });
});
