// One-command deploy to GitHub Pages via the gh-pages branch.
// Used until the gh token gains `workflow` scope and ci/deploy.yml can move to
// .github/workflows/ for push-to-deploy. Run: npm run deploy
import { execSync } from 'node:child_process'
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REMOTE = 'https://github.com/dixxxvhb/movie-vault.git'
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

console.log('› building…')
run('npm run data')
run('npm run build')

const dir = mkdtempSync(join(tmpdir(), 'vault-ghp-'))
console.log('› staging dist → gh-pages in', dir)
cpSync('dist', dir, { recursive: true })
writeFileSync(join(dir, '.nojekyll'), '')

const git = (c) => run(`git ${c}`, { cwd: dir })
git('init -q')
git('add -A')
git('commit -qm "deploy"')
git('branch -M gh-pages')
git(`remote add origin ${REMOTE}`)
git('push -f origin gh-pages')

rmSync(dir, { recursive: true, force: true })
console.log('✓ deployed → https://dixxxvhb.github.io/movie-vault/')
