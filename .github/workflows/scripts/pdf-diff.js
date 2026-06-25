const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

exports.pdfDiff = ({ core }) => {
  // Generated PDFs are stored under backend/tmp-pdf-gen/{base,head}
  const pdfRoot = path.join("backend", "tmp-pdf-gen");
  const dirs = {
    base: path.join(pdfRoot, "base"),
    head: path.join(pdfRoot, "head"),
    diff: path.join(pdfRoot, "diffs"),
  };

  // Ensure diff folder exists
  fs.mkdirSync(dirs.diff, { recursive: true });

  // Read the manifest gen-pdf writes next to the PDFs
  const loadManifest = (root) => {
    const manifestPath = path.join(root, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      core.warning(`Failed to parse ${manifestPath}: ${err}`);
      return {};
    }
  };

  // Retrieve and merge manifests
  const baseManifest = loadManifest(dirs.base);
  const headManifest = loadManifest(dirs.head);
  const manifest = { ...baseManifest, ...headManifest };

  // The manifest's keys enumerate exactly the PDFs gen-pdf produced on each side.
  const baseFiles = new Set(Object.keys(baseManifest));
  const headFiles = new Set(Object.keys(headManifest));
  const allFiles = Array.from(new Set([...baseFiles, ...headFiles])).sort();

  // Markdown table that will be posted as a comment on the PR
  const baseRef = process.env.BASE_REF;
  const rows = [
    "### PDF Diff Summary",
    "",
    `Comparing against base branch: \`${baseRef}\``,
    "",
    "| File | Status |",
    "| --- | --- |",
  ];

  // Map diff states to user-friendly labels
  const statusLabels = {
    identical: "✅ No changes",
    diff: "⚠️ Changes",
    added: "🆕 Added",
    removed: "🗑️ Removed",
  };

  let diffFound = false;
  const changedFiles = [];

  // Iterate through every PDF present in either ref, run diff-pdf where applicable, and capture the status
  for (const relativePath of allFiles) {
    const baseFile = path.join(dirs.base, relativePath);
    const headFile = path.join(dirs.head, relativePath);
    const hasBase = baseFiles.has(relativePath);
    const hasHead = headFiles.has(relativePath);
    let status = "";

    if (hasBase && hasHead) {
      const diffOutput = path.join(dirs.diff, relativePath);
      const { status: exitCode } = spawnSync(
        "diff-pdf",
        [
          "--mark-differences",
          "--skip-identical",
          `--output-diff=${diffOutput}`,
          baseFile,
          headFile,
        ],
        { stdio: "inherit" },
      );

      if (exitCode === 0) {
        status = statusLabels.identical;
        fs.rmSync(diffOutput, { force: true });
        core.info(`No differences in ${relativePath}`);
      } else if (exitCode === 1) {
        status = statusLabels.diff;
        diffFound = true;
        core.info(`Differences found in ${relativePath}`);
      } else {
        throw new Error(
          `diff-pdf failed for ${relativePath} with exit code ${exitCode}`,
        );
      }
    } else if (hasHead) {
      status = statusLabels.added;
      diffFound = true;
      core.info(`File ${relativePath} added`);
    } else {
      status = statusLabels.removed;
      diffFound = true;
      core.info(`File ${relativePath} removed`);
    }

    rows.push(`| ${relativePath} | ${status} |`);
    if (status !== statusLabels.identical) {
      changedFiles.push({ relativePath, status });
    }
  }

  rows.push("");

  // Report the diff table via the workflow job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${rows.join("\n")}\n`);
  }

  // Resolve a PDF output name to its source template via the manifest
  const resolveTemplate = (relativePath) => {
    const templateName = manifest[relativePath];
    if (!templateName) {
      return null;
    }
    const templatePath = path.join("backend", "templates", templateName);
    return fs.existsSync(templatePath) ? templatePath : null;
  };

  // Add a yellow warning annotation for every changed PDF
  for (const { relativePath, status } of changedFiles) {
    const template = resolveTemplate(relativePath);
    const annotation = { title: "PDF output changed" };
    if (template) {
      annotation.file = template;
      annotation.startLine = 1;
    }
    core.warning(
      `${relativePath}: ${status}, see the job summary for the visual diff.`,
      annotation,
    );
  }

  core.setOutput("diff_found", diffFound ? "1" : "0");
};
