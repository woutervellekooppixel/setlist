/* global document */

const photoshop = require("photoshop");
const { app, core } = photoshop;
const { storage } = require("uxp");

let outFolderEntry = null;
let lastMaxPossibleSlices = null;
let userOverrodeCropCount = false;

function pad2(num) {
  return num < 10 ? `0${num}` : String(num);
}

function setStatus(message) {
  const el = document.getElementById("status");
  el.textContent = message || "";
}

function getActiveDocOrNull() {
  try {
    return app.activeDocument;
  } catch {
    return null;
  }
}

function asNumber(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    if (typeof value.value === "number") return value.value;
    if (typeof value._value === "number") return value._value;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function sanitizeSliceWidth(value) {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return NaN;
  return n;
}

function sanitizeCropCount(value) {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return NaN;
  return n;
}

function sanitizeDocHeight(value) {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return NaN;
  return n;
}

function computeLimits(doc, sliceWidth) {
  const docWidth = asNumber(doc.width);
  const docHeight = asNumber(doc.height);

  if (!Number.isFinite(docWidth) || !Number.isFinite(docHeight)) {
    return { ok: false, message: "Could not read document dimensions." };
  }

  if (!Number.isFinite(sliceWidth) || sliceWidth < 1) {
    return { ok: false, message: "Enter a valid crop width (X) in pixels." };
  }

  const numFullSlices = Math.floor(docWidth / sliceWidth);
  const remainderPx = docWidth % sliceWidth;

  if (numFullSlices < 1) {
    return {
      ok: false,
      message: `The document is narrower than ${sliceWidth}px.`
    };
  }

  const maxPossibleSlices = numFullSlices;

  const warnings = [];
  if (remainderPx > 0) {
    warnings.push(
      `${remainderPx}px on the right will be ignored (no full ${sliceWidth}px crop).`
    );
  }

  return {
    ok: true,
    docWidth,
    docHeight,
    numFullSlices,
    remainderPx,
    maxPossibleSlices,
    warnings
  };
}

async function refreshUI() {
  const runBtn = document.getElementById("run");
  const countField = document.getElementById("count");
  const sliceWidthField = document.getElementById("sliceWidth");

  const doc = getActiveDocOrNull();
  if (!doc) {
    runBtn.disabled = true;
    countField.value = countField.value || "";
    sliceWidthField.value = sliceWidthField.value || "1080";
    setStatus("Open a document in Photoshop first.");
    return;
  }

  const sliceWidth = sanitizeSliceWidth(sliceWidthField.value || "1080");
  const limits = computeLimits(doc, sliceWidth);
  if (!limits.ok) {
    runBtn.disabled = true;
    countField.value = countField.value || "";
    // Keep a reasonable default visible
    sliceWidthField.value = sliceWidthField.value || "1080";
    setStatus(limits.message);
    return;
  }

  runBtn.disabled = false;
  sliceWidthField.value = String(sliceWidth);

  // Clamp and reflect allowed crop-count range for this doc.
  countField.setAttribute("max", String(limits.maxPossibleSlices));
  const currentCount = sanitizeCropCount(countField.value);

  // Default behavior: always select the maximum that fits.
  // If the user manually typed a smaller number, keep it (but clamp).
  let nextCount;
  const previousMax = lastMaxPossibleSlices;
  const looksAuto =
    !userOverrodeCropCount ||
    !Number.isFinite(currentCount) ||
    (Number.isFinite(previousMax) && currentCount === previousMax);

  if (looksAuto) {
    nextCount = limits.maxPossibleSlices;
    userOverrodeCropCount = false;
  } else {
    nextCount = currentCount;
  }

  if (!Number.isFinite(nextCount)) nextCount = limits.maxPossibleSlices;
  if (nextCount > limits.maxPossibleSlices) nextCount = limits.maxPossibleSlices;
  if (nextCount < 1) nextCount = 1;
  countField.value = String(nextCount);
  lastMaxPossibleSlices = limits.maxPossibleSlices;

  const warningText = limits.warnings.length ? `\n\nHeads up:\n- ${limits.warnings.join("\n- ")}` : "";
  const folderText = outFolderEntry ? `\n\nOutput folder selected.` : "\n\nNo output folder selected yet.";

  setStatus(
    `Crop width (X): ${sliceWidth}px\n` +
      `Document width: ${Math.round(limits.docWidth)}px\n` +
      `Full crops possible: ${limits.numFullSlices}` +
      warningText +
      folderText
  );
}

async function chooseFolder() {
  outFolderEntry = await storage.localFileSystem.getFolder();
  await refreshUI();
}

async function cropDocument(doc, bounds) {
  try {
    // Most UXP DOM methods use object bounds
    await doc.crop(bounds);
    return;
  } catch (e) {
    // Fallback: some builds accept array bounds
    await doc.crop([bounds.left, bounds.top, bounds.right, bounds.bottom]);
  }
}

async function exportCrops() {
  const sliceWidthField = document.getElementById("sliceWidth");
  const countField = document.getElementById("count");
  const runBtn = document.getElementById("run");

  const doc = getActiveDocOrNull();
  if (!doc) {
    setStatus("No active document.");
    return;
  }

  const sliceWidth = sanitizeSliceWidth(sliceWidthField.value || "1080");
  const limits = computeLimits(doc, sliceWidth);
  if (!limits.ok) {
    setStatus(limits.message);
    return;
  }

  let slicesToCreate = sanitizeCropCount(countField.value);
  if (!Number.isFinite(slicesToCreate)) slicesToCreate = limits.maxPossibleSlices;
  if (slicesToCreate > limits.maxPossibleSlices) slicesToCreate = limits.maxPossibleSlices;
  if (slicesToCreate < 1) slicesToCreate = 1;
  countField.value = String(slicesToCreate);

  if (!outFolderEntry) {
    setStatus("Choose an output folder first.");
    return;
  }

  runBtn.disabled = true;

  try {
    await core.executeAsModal(
      async () => {
        for (let i = 0; i < slicesToCreate; i++) {
          const index = i + 1;
          const cropName = `crop_${pad2(index)}`;

          const left = i * sliceWidth;
          const top = 0;
          const right = left + sliceWidth;
          const bottom = limits.docHeight;

          const dup = await doc.duplicate(cropName, false);
          await cropDocument(dup, { left, top, right, bottom });

          const outFile = await outFolderEntry.createFile(`${cropName}.jpg`, {
            overwrite: true
          });

          await dup.saveAs.jpg(outFile, { quality: 12 }, true);
          dup.closeWithoutSaving();

          setStatus(`Exported ${index}/${slicesToCreate}: ${cropName}.jpg`);
        }
      },
      { commandName: "Export crops" }
    );

    await refreshUI();
    setStatus(`Done! ${slicesToCreate} crops saved.`);
  } catch (e) {
    setStatus(`Export failed:\n${e && e.message ? e.message : String(e)}`);
  } finally {
    runBtn.disabled = false;
  }
}


async function addGuides() {
  const doc = getActiveDocOrNull();
  if (!doc) {
    setStatus("No document open.");
    return;
  }
  const sliceWidth = sanitizeSliceWidth(document.getElementById("sliceWidth").value);
  if (!Number.isFinite(sliceWidth) || sliceWidth < 1) {
    setStatus("Enter a valid crop width (X) in pixels.");
    return;
  }
  const docWidth = asNumber(doc.width);
  const numGuides = Math.floor(docWidth / sliceWidth);
  try {
    // Check op artboards
    const doc = app.activeDocument;
    if (doc.artboards && doc.artboards.length > 0) {
      setStatus("Guides toevoegen werkt niet op artboards. Gebruik een standaard document zonder artboards.");
      return;
    }
    await core.executeAsModal(async () => {
      const { action } = require('photoshop');
      const docWidth = asNumber(doc.width);
      let guidesAdded = 0;
      for (let i = 1; i < numGuides; i++) {
        const pos = i * sliceWidth;
        console.log(`Guide op positie: ${pos} px (canvas breedte: ${docWidth})`);
        if (pos >= docWidth) {
          console.warn(`Guide op ${pos} px valt buiten het canvas en wordt niet geplaatst.`);
          continue;
        }
        await action.batchPlay([
          {
            _obj: "make",
            new: {
              _class: "guide"
            },
            orientation: {
              _enum: "orientation",
              _value: "vertical"
            },
            position: {
              _unit: "pixelsUnit",
              _value: pos
            }
          }
        ], { synchronousExecution: true });
        guidesAdded++;
      }
      if (guidesAdded === 0) {
        setStatus("Geen guides toegevoegd: alle posities vallen buiten het canvas.");
      } else {
        setStatus(`Added ${guidesAdded} guides.\n\nLet op: Guides zijn alleen zichtbaar als je in Photoshop naar Weergave > Tonen > Hulplijnen gaat en deze optie aanzet. Guides werken niet op artboards.`);
      }
    }, { commandName: "Add guides" });
  } catch (e) {
    setStatus(`Failed to add guides: ${e && e.message ? e.message : String(e)}`);
  }
}

async function clearGuides() {
  const doc = getActiveDocOrNull();
  if (!doc) {
    setStatus("No document open.");
    return;
  }
  try {
    await core.executeAsModal(async () => {
      if (typeof doc.guides.removeAll === 'function') {
        await doc.guides.removeAll();
      } else {
        throw new Error('Guides verwijderen wordt niet ondersteund in deze Photoshop-versie.');
      }
    }, { commandName: "Clear guides" });
    setStatus("All guides cleared.");
  } catch (e) {
    setStatus(`Failed to clear guides: ${e && e.message ? e.message : String(e)}`);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("chooseFolder").addEventListener("click", chooseFolder);
  document.getElementById("run").addEventListener("click", exportCrops);
  document.getElementById("sliceWidth").addEventListener("input", refreshUI);
  document.getElementById("count").addEventListener("input", () => {
    userOverrodeCropCount = true;
    refreshUI();
  });

  // Nieuwe knoppen
  const addGuidesBtn = document.getElementById("addGuides");
  if (addGuidesBtn) addGuidesBtn.addEventListener("click", addGuides);
  const clearGuidesBtn = document.getElementById("clearGuides");
  if (clearGuidesBtn) clearGuidesBtn.addEventListener("click", clearGuides);

  document.getElementById("sliceWidth").value = "1080";
  await refreshUI();
});
