import re

with open("src/app.js", "r") as f:
    content = f.read()

# Inject into handleVideoUpload
content = content.replace(
    'state.video.status = `${state.video.frames.length} frames ready from ${file.name}`;',
    'state.video.status = `${state.video.frames.length} frames ready from ${file.name}`;\n    unlockAchievement("badge-video");\n    gainXp(20);'
)

# Inject into generateGemma
content = content.replace(
    'state.gemma.status = "Gemma 4 generation complete";',
    'state.gemma.status = "Gemma 4 generation complete";\n    unlockAchievement("badge-gemma");\n    gainXp(30);'
)

# Inject into analyzePdf
content = content.replace(
    'state.pdf.status = `PDF analyzed (${state.pdf.extractPreview.length} chars)`;',
    'state.pdf.status = `PDF analyzed (${state.pdf.extractPreview.length} chars)`;\n    unlockAchievement("badge-pdf");\n    gainXp(40);'
)

# Inject perfect score check into renderSummary
content = content.replace(
    'const s = state.analysis.summary;',
    'const s = state.analysis.summary;\n  if (s.formHealthScore >= 90) unlockAchievement("badge-perfect");\n  gainXp(10); // Base XP for viewing summary'
)

with open("src/app.js", "w") as f:
    f.write(content)
print("Injected XP logic successfully")
