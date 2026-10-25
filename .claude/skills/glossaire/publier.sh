#!/bin/sh
# Publie la refonte d'entrées du glossaire : version incrémentée, commit, push.
# Usage : publier.sh "message" fichier...
set -e
cd "$(dirname "$0")/../../.."
msg="$1"; shift
# Les retouches de l'utilisateur doivent avoir survécu aux réécritures.
python -I .claude/skills/glossaire/retouches.py $(printf '%s\n' "$@" | grep 'units/g-.*\.yaml$') || { echo "retouches de l'utilisateur perdues : publication refusée"; exit 1; }
git pull -q --rebase --autostash
f=content/courses/plotin/course.yaml
v=$(grep -m1 '^version:' $f | awk '{print $2}')
sed -i "s/^version: $v\$/version: $((v+1))/" $f
npm run -s content:check 2>&1 | grep -q "Contenu valide" || { echo "content:check en échec"; exit 1; }
git add "$f" "$@"
git commit -q -m "$msg (version $((v+1)))

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q
git log --oneline -1
