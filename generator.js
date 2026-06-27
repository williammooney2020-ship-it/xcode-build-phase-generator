// Xcode Build Phase Script Generator — browser-only, no API.
// Generate common run-script build phases ready to paste into Xcode.

const TEMPLATES = [
  {
    id: "swiftlint",
    name: "SwiftLint",
    category: "Code Quality",
    icon: "🔍",
    desc: "Enforce Swift style and conventions. Fails the build on errors; shows warnings in Xcode.",
    inputs: [
      { id: "strict", label: "Fail build on violations", type: "bool", default: true },
      { id: "configPath", label: "Config file path (leave blank for default .swiftlint.yml)", type: "text", placeholder: ".swiftlint.yml" },
    ],
    generate(vals) {
      const strict = vals.strict !== false;
      const config = vals.configPath ? ` --config "${vals.configPath}"` : "";
      return `# SwiftLint Build Phase
# Install: brew install swiftlint  OR  add via SPM

if which swiftlint > /dev/null; then
  swiftlint${config}${strict ? "" : " --lenient"}
else
  echo "warning: SwiftLint not installed. Install via: brew install swiftlint"
fi`;
    },
    inputFiles: ["$(SRCROOT)/.swiftlint.yml"],
    outputFiles: [],
    note: "Add as a Run Script phase before Compile Sources.",
  },
  {
    id: "swiftgen",
    name: "SwiftGen",
    category: "Code Generation",
    icon: "⚡",
    desc: "Generate type-safe Swift code for assets, strings, storyboards, and colors.",
    inputs: [
      { id: "configPath", label: "SwiftGen config path", type: "text", placeholder: "${SRCROOT}/swiftgen.yml", default: "${SRCROOT}/swiftgen.yml" },
    ],
    generate(vals) {
      const config = vals.configPath || "${SRCROOT}/swiftgen.yml";
      return `# SwiftGen Build Phase
# Install: brew install swiftgen  OR  via SPM

if which swiftgen > /dev/null; then
  swiftgen config run --config "${config}"
else
  echo "warning: SwiftGen not installed. Install via: brew install swiftgen"
fi`;
    },
    inputFiles: ["$(SRCROOT)/swiftgen.yml"],
    outputFiles: ["$(SRCROOT)/Generated/Assets.swift", "$(SRCROOT)/Generated/Strings.swift"],
    note: "Place BEFORE Compile Sources. SwiftGen reads your .yml config.",
  },
  {
    id: "sourcery",
    name: "Sourcery",
    category: "Code Generation",
    icon: "🔮",
    desc: "Generate Swift boilerplate from annotations — mock generation, Equatable, Codable, and more.",
    inputs: [
      { id: "configPath", label: "Config file", type: "text", placeholder: "${SRCROOT}/.sourcery.yml", default: "${SRCROOT}/.sourcery.yml" },
    ],
    generate(vals) {
      const config = vals.configPath || "${SRCROOT}/.sourcery.yml";
      return `# Sourcery Build Phase
# Install: brew install sourcery

if which sourcery > /dev/null; then
  sourcery --config "${config}"
else
  echo "warning: Sourcery not installed. Install via: brew install sourcery"
fi`;
    },
    inputFiles: ["$(SRCROOT)/.sourcery.yml"],
    outputFiles: ["$(SRCROOT)/Generated/AutoMockable.generated.swift"],
    note: "Place BEFORE Compile Sources.",
  },
  {
    id: "version-bump",
    name: "Auto Version Bump (Build Number)",
    category: "Build Management",
    icon: "🔢",
    desc: "Automatically increment the CFBundleVersion (build number) on every archive build.",
    inputs: [
      { id: "archiveOnly", label: "Only bump on Archive (not Debug builds)", type: "bool", default: true },
    ],
    generate(vals) {
      const guard = vals.archiveOnly !== false
        ? `# Only bump build number during Archive actions
if [ "$CONFIGURATION" != "Release" ] || [ "$ACTION" != "archive" ]; then
  echo "Skipping build number bump (not an Archive build)"
  exit 0
fi

` : "";
      return `# Auto Build Number Bump
# Increments CFBundleVersion each time you Archive.

${guard}PLIST="${INFOPLIST_FILE}"
if [ -z "$PLIST" ]; then
  PLIST="${SRCROOT}/${INFOPLIST_PATH}"
fi

CURRENT=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "$PLIST" 2>/dev/null)
if [ -z "$CURRENT" ]; then
  CURRENT=0
fi

NEXT=$((CURRENT + 1))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT" "$PLIST"
echo "Build number bumped: $CURRENT → $NEXT"`.replace(/\${INFOPLIST_FILE}/g, "${INFOPLIST_FILE}").replace(/\${SRCROOT}/g, "${SRCROOT}").replace(/\${INFOPLIST_PATH}/g, "${INFOPLIST_PATH}");
    },
    inputFiles: ["$(SRCROOT)/$(INFOPLIST_FILE)"],
    outputFiles: [],
    note: "Add as a Run Script phase. For CURRENT_PROJECT_VERSION in xcconfig, use agvtool instead.",
  },
  {
    id: "r-swift",
    name: "R.swift",
    category: "Code Generation",
    icon: "🎨",
    desc: "Generates a strongly typed R.swift file giving type-safe access to images, fonts, and localized strings.",
    inputs: [],
    generate() {
      return `# R.swift Build Phase
# Add R.swift via SPM: https://github.com/mac-cain13/R.swift

"$PODS_ROOT/R.swift/rswift" generate "$SRCROOT/R.generated.swift" \\
  --accessLevel internal \\
  --bundleSource modules`;
    },
    inputFiles: ["$TEMP_DIR/rswift-lastrun"],
    outputFiles: ["$SRCROOT/R.generated.swift", "$TEMP_DIR/rswift-lastrun"],
    note: "If using SPM, adjust the binary path from Pods to the derived data bin.",
  },
  {
    id: "acknowledgements",
    name: "Acknowledgements Plist Generator",
    category: "Legal / App Store",
    icon: "📄",
    desc: "Generates a Settings.bundle/Acknowledgements.plist from your CocoaPods LICENSES for in-app legal screens.",
    inputs: [],
    generate() {
      return `# Acknowledgements Generator (CocoaPods)
# Converts Pods/Pods.xcodeproj licenses to a Settings Bundle plist.

python3 << 'PYEOF'
import os, glob, plistlib, pathlib

pods_dir = os.path.join(os.environ.get("SRCROOT", "."), "Pods")
settings_bundle = os.path.join(os.environ.get("SRCROOT", "."), "Settings.bundle")
os.makedirs(settings_bundle, exist_ok=True)

entries = []
for lic_path in sorted(glob.glob(f"{pods_dir}/*/LICENSE*")):
    name = pathlib.Path(lic_path).parent.name
    text = open(lic_path).read()
    entries.append({
        "Title": name,
        "Type": "PSChildPaneSpecifier",
        "File": f"Acknowledgements/{name}",
    })
    sub_dir = os.path.join(settings_bundle, "Acknowledgements")
    os.makedirs(sub_dir, exist_ok=True)
    with open(os.path.join(sub_dir, f"{name}.plist"), "wb") as f:
        plistlib.dump({"StringsTable": "Root", "PreferenceSpecifiers": [
            {"Type": "PSGroupSpecifier", "FooterText": text}
        ]}, f)

root_plist = os.path.join(settings_bundle, "Acknowledgements.plist")
with open(root_plist, "wb") as f:
    plistlib.dump({"StringsTable": "Root", "PreferenceSpecifiers": entries}, f)

print(f"Generated Acknowledgements.plist with {len(entries)} pods")
PYEOF`;
    },
    inputFiles: [],
    outputFiles: ["$(SRCROOT)/Settings.bundle/Acknowledgements.plist"],
    note: "Requires CocoaPods. For SPM, use AcknowledgementsPlist or similar package.",
  },
  {
    id: "firebase-crashlytics",
    name: "Firebase Crashlytics dSYM Upload",
    category: "Crash Reporting",
    icon: "🔥",
    desc: "Upload dSYM files to Firebase Crashlytics for deobfuscated crash reports.",
    inputs: [
      { id: "googleInfoPlist", label: "GoogleService-Info.plist path", type: "text", placeholder: "${SRCROOT}/GoogleService-Info.plist", default: "${SRCROOT}/GoogleService-Info.plist" },
    ],
    generate(vals) {
      const plist = vals.googleInfoPlist || "${SRCROOT}/GoogleService-Info.plist";
      return `# Firebase Crashlytics dSYM Upload
# Requires Firebase SDK in your project.

"${PODS_ROOT}/FirebaseCrashlytics/upload-symbols" \\
  -gsp "${plist}" \\
  -p ios \\
  "${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}"`.replace(/\${PODS_ROOT}/g,"${PODS_ROOT}").replace(/\${DWARF_DSYM_FOLDER_PATH}/g,"${DWARF_DSYM_FOLDER_PATH}").replace(/\${DWARF_DSYM_FILE_NAME}/g,"${DWARF_DSYM_FILE_NAME}").replace(/\${TARGET_NAME}/g,"${TARGET_NAME}").replace(/\${plist}/g, plist);
    },
    inputFiles: ["$(SRCROOT)/GoogleService-Info.plist", "$(DWARF_DSYM_FOLDER_PATH)/$(DWARF_DSYM_FILE_NAME)/Contents/Resources/DWARF/$(TARGET_NAME)"],
    outputFiles: [],
    note: "Must run AFTER the main build step. Only needed for Release / Archive builds.",
  },
  {
    id: "copy-fonts",
    name: "Copy Custom Fonts Check",
    category: "Assets",
    icon: "🔤",
    desc: "Warns if any custom fonts listed in UIAppFonts (Info.plist) are missing from the bundle.",
    inputs: [],
    generate() {
      return `# Custom Font Validation
# Checks that every font in UIAppFonts is present in the app bundle.

PLIST="${BUILT_PRODUCTS_DIR}/${INFOPLIST_PATH}"
FONTS=$(python3 -c "
import plistlib, sys
with open(sys.argv[1], 'rb') as f:
    p = plistlib.load(f)
for font in p.get('UIAppFonts', []):
    print(font)
" "$PLIST" 2>/dev/null)

BUNDLE="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app"
MISSING=0

for font in $FONTS; do
  if ! find "$BUNDLE" -name "$font" | grep -q .; then
    echo "error: Font '$font' listed in UIAppFonts not found in app bundle"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "All UIAppFonts validated ✓"
fi`.replace(/\${BUILT_PRODUCTS_DIR}/g,"${BUILT_PRODUCTS_DIR}").replace(/\${INFOPLIST_PATH}/g,"${INFOPLIST_PATH}").replace(/\${PRODUCT_NAME}/g,"${PRODUCT_NAME}");
    },
    inputFiles: ["$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)"],
    outputFiles: [],
    note: "Runs after compilation. Add AFTER the Copy Bundle Resources phase.",
  },
  {
    id: "custom",
    name: "Custom Script",
    category: "Custom",
    icon: "✏️",
    desc: "Write your own shell script from scratch.",
    inputs: [
      { id: "script", label: "Shell script", type: "textarea", placeholder: "#!/bin/sh\necho \"Hello from build phase\"", default: "#!/bin/sh\n# Your custom build phase script\n\necho \"Build phase running for target: ${TARGET_NAME}\"" },
      { id: "inputFiles", label: "Input files (one per line)", type: "textarea", placeholder: "$(SRCROOT)/some-input.yml" },
      { id: "outputFiles", label: "Output files (one per line)", type: "textarea", placeholder: "$(SRCROOT)/Generated/output.swift" },
    ],
    generate(vals) { return vals.script || "#!/bin/sh\n# Your script here"; },
    inputFiles: [],
    outputFiles: [],
    note: "Customize input/output files to enable Xcode's incremental build system.",
  },
];

let activeTemplateId = null;
let fieldValues = {};

const STORAGE_KEY = "build_phase_v1";

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTemplateId, fieldValues }));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      activeTemplateId = d.activeTemplateId ?? null;
      fieldValues = d.fieldValues ?? {};
    }
  } catch (e) {}
}

function selectTemplate(id) {
  activeTemplateId = id;
  const tpl = TEMPLATES.find(t => t.id === id);

  // Set defaults for fields that have no stored value
  if (tpl && !fieldValues[id]) {
    fieldValues[id] = {};
    tpl.inputs.forEach(inp => {
      if (inp.default !== undefined) fieldValues[id][inp.id] = inp.default;
    });
  }

  renderForm();
  renderOutput();
  save();

  // Highlight selected template card
  document.querySelectorAll(".tpl-card").forEach(el => el.classList.remove("selected"));
  const card = document.getElementById("tpl_" + id);
  if (card) {
    card.classList.add("selected");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderTemplateList() {
  const el = document.getElementById("templateList");
  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  el.innerHTML = categories.map(cat => {
    const tpls = TEMPLATES.filter(t => t.category === cat);
    return `
      <div class="cat-group">
        <div class="cat-label">${cat}</div>
        ${tpls.map(t => `
          <div class="tpl-card${activeTemplateId === t.id ? " selected" : ""}" id="tpl_${t.id}" onclick="selectTemplate('${t.id}')">
            <span class="tpl-icon">${t.icon}</span>
            <div>
              <div class="tpl-name">${t.name}</div>
              <div class="tpl-desc">${t.desc}</div>
            </div>
          </div>`).join("")}
      </div>`;
  }).join("");
}

function renderForm() {
  const el = document.getElementById("formArea");
  if (!activeTemplateId) {
    el.innerHTML = `<div class="empty-msg">Select a template on the left to get started.</div>`;
    return;
  }
  const tpl = TEMPLATES.find(t => t.id === activeTemplateId);
  if (!tpl) return;

  const vals = fieldValues[activeTemplateId] || {};

  if (tpl.inputs.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:13.5px;padding:8px 0">No configuration needed for this template — the script is ready to copy.</div>`;
    return;
  }

  el.innerHTML = tpl.inputs.map(inp => {
    const val = vals[inp.id] !== undefined ? vals[inp.id] : (inp.default ?? "");
    if (inp.type === "bool") {
      return `
      <div class="form-field">
        <label class="toggle-label">
          <input type="checkbox" ${val ? "checked" : ""} onchange="setVal('${inp.id}', this.checked)" />
          <span>${inp.label}</span>
        </label>
      </div>`;
    } else if (inp.type === "textarea") {
      return `
      <div class="form-field">
        <label class="field-label">${inp.label}</label>
        <textarea rows="5" placeholder="${esc(inp.placeholder || "")}" oninput="setVal('${inp.id}', this.value)">${esc(String(val))}</textarea>
      </div>`;
    } else {
      return `
      <div class="form-field">
        <label class="field-label">${inp.label}</label>
        <input type="text" placeholder="${esc(inp.placeholder || "")}" value="${esc(String(val))}" oninput="setVal('${inp.id}', this.value)" spellcheck="false" />
      </div>`;
    }
  }).join("");
}

function setVal(inputId, value) {
  if (!fieldValues[activeTemplateId]) fieldValues[activeTemplateId] = {};
  fieldValues[activeTemplateId][inputId] = value;
  renderOutput();
  save();
}

function renderOutput() {
  const tpl = TEMPLATES.find(t => t.id === activeTemplateId);
  if (!tpl) {
    document.getElementById("scriptOutput").textContent = "# Select a template to generate a script.";
    document.getElementById("inputFilesOutput").textContent = "";
    document.getElementById("outputFilesOutput").textContent = "";
    document.getElementById("noteBox").style.display = "none";
    return;
  }

  const vals = fieldValues[activeTemplateId] || {};

  // Generate script
  let script;
  try { script = tpl.generate(vals); } catch (e) { script = "# Error generating script: " + e.message; }
  document.getElementById("scriptOutput").textContent = script;

  // Input/output files
  let inputFiles = [...(tpl.inputFiles || [])];
  let outputFiles = [...(tpl.outputFiles || [])];

  // For custom template, pull from textarea
  if (activeTemplateId === "custom") {
    const inpRaw = vals.inputFiles || "";
    const outRaw = vals.outputFiles || "";
    inputFiles = inpRaw.split("\n").map(s => s.trim()).filter(Boolean);
    outputFiles = outRaw.split("\n").map(s => s.trim()).filter(Boolean);
  }

  document.getElementById("inputFilesOutput").textContent =
    inputFiles.length ? inputFiles.join("\n") : "(none)";
  document.getElementById("outputFilesOutput").textContent =
    outputFiles.length ? outputFiles.join("\n") : "(none)";

  // Note
  if (tpl.note) {
    document.getElementById("noteText").textContent = tpl.note;
    document.getElementById("noteBox").style.display = "block";
  } else {
    document.getElementById("noteBox").style.display = "none";
  }
}

function copyScript() {
  const text = document.getElementById("scriptOutput").textContent;
  navigator.clipboard.writeText(text).then(() => flash("copyScriptBtn", "Copied!"));
}

function copyInputFiles() {
  const text = document.getElementById("inputFilesOutput").textContent;
  if (text === "(none)") return;
  navigator.clipboard.writeText(text).then(() => flash("copyInputBtn", "Copied!"));
}

function copyOutputFiles() {
  const text = document.getElementById("outputFilesOutput").textContent;
  if (text === "(none)") return;
  navigator.clipboard.writeText(text).then(() => flash("copyOutputBtn", "Copied!"));
}

function flash(id, msg) {
  const btn = document.getElementById(id);
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  renderTemplateList();
  renderForm();
  renderOutput();
  if (activeTemplateId) {
    const card = document.getElementById("tpl_" + activeTemplateId);
    if (card) card.classList.add("selected");
  }
});
