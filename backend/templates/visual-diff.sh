#!/bin/bash

# Dependencies:
# - typst: https://typst.app/
# - diff-pdf: https://vslavik.github.io/diff-pdf/

# instruct the user to switch to the main branch before generating the "old" PDFs
echo "Please make sure you are on the main branch to generate the 'old' PDFs."
read -p "Press Enter to continue..."

typst compile --font-path fonts model-n-10-2.typ model-n-10-2-old.pdf
typst compile --font-path fonts model-na-14-2-bijlage1.typ model-na-14-2-bijlage1-old.pdf
typst compile --font-path fonts model-na-14-2.typ model-na-14-2-old.pdf
typst compile --font-path fonts model-na-31-2-bijlage1.typ model-na-31-2-bijlage1-old.pdf
typst compile --font-path fonts model-na-31-2-bijlage2.typ model-na-31-2-bijlage2-old.pdf
typst compile --font-path fonts model-na-31-2-inlegvel.typ model-na-31-2-inlegvel-old.pdf
typst compile --font-path fonts model-na-31-2.typ model-na-31-2-old.pdf
typst compile --font-path fonts model-p-2a.typ model-p-2a-old.pdf

# instruct the user to switch to the feature branch before generating the "new" PDFs
echo "Please make sure you are on the feature branch to generate the 'new' PDFs."
read -p "Press Enter to continue..."

typst compile --font-path fonts model-n-10-2.typ model-n-10-2-new.pdf
typst compile --font-path fonts model-na-14-2-bijlage1.typ model-na-14-2-bijlage1-new.pdf
typst compile --font-path fonts model-na-14-2.typ model-na-14-2-new.pdf
typst compile --font-path fonts model-na-31-2-bijlage1.typ model-na-31-2-bijlage1-new.pdf
typst compile --font-path fonts model-na-31-2-bijlage2.typ model-na-31-2-bijlage2-new.pdf
typst compile --font-path fonts model-na-31-2-inlegvel.typ model-na-31-2-inlegvel-new.pdf
typst compile --font-path fonts model-na-31-2.typ model-na-31-2-new.pdf
typst compile --font-path fonts model-p-2a.typ model-p-2a-new.pdf

diff-pdf --view model-n-10-2-old.pdf model-n-10-2-new.pdf
diff-pdf --view model-na-14-2-bijlage1-old.pdf model-na-14-2-bijlage1-new.pdf
diff-pdf --view model-na-14-2-old.pdf model-na-14-2-new.pdf
diff-pdf --view model-na-31-2-bijlage1-old.pdf model-na-31-2-bijlage1-new.pdf
diff-pdf --view model-na-31-2-bijlage2-old.pdf model-na-31-2-bijlage2-new.pdf
diff-pdf --view model-na-31-2-inlegvel-old.pdf model-na-31-2-inlegvel-new.pdf
diff-pdf --view model-na-31-2-old.pdf model-na-31-2-new.pdf
diff-pdf --view model-p-2a-old.pdf model-p-2a-new.pdf
