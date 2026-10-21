import { test } from "node:test";
import assert from "node:assert/strict";
import { getPublishedWorkshopVideo } from "@/lib/workshop";

const LIBRARY_ID = "123456";
const VIDEO_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("a published, valid reference is returned", () => {
  assert.deepEqual(
    getPublishedWorkshopVideo({ workshopBunnyLibraryId: LIBRARY_ID, workshopBunnyVideoId: VIDEO_ID, workshopVideoPublished: true }),
    { libraryId: LIBRARY_ID, videoId: VIDEO_ID }
  );
});

test("an unpublished video is hidden", () => {
  assert.equal(
    getPublishedWorkshopVideo({ workshopBunnyLibraryId: LIBRARY_ID, workshopBunnyVideoId: VIDEO_ID, workshopVideoPublished: false }),
    null
  );
});

test("missing columns (migration not applied) or settings row mean no video", () => {
  assert.equal(getPublishedWorkshopVideo({}), null);
  assert.equal(getPublishedWorkshopVideo(null), null);
});

test("incomplete or invalid identifiers are never embedded", () => {
  assert.equal(getPublishedWorkshopVideo({ workshopBunnyVideoId: VIDEO_ID, workshopVideoPublished: true }), null);
  assert.equal(
    getPublishedWorkshopVideo({ workshopBunnyLibraryId: "abc", workshopBunnyVideoId: VIDEO_ID, workshopVideoPublished: true }),
    null
  );
});
