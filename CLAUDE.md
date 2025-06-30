# Claude Memory - Portfolio Site Progress

## Project Overview
Building a professional portfolio site for Kevin Scott at https://biscuitsandgravy.ai
- Focus: AI Systems & Performance Engineering (NOT machine learning)
- Design: Minimalist, Jony Ive-inspired aesthetic
- Tech Stack: Quarto static site generator, GitHub Pages, Cloudflare

## Completed Milestones

### M0: Skeleton + Domain Online ✅
- Created Quarto project structure
- Set up GitHub Pages with Actions deployment
- Configured Cloudflare DNS (domain registered with Cloudflare)
- HTTPS working on biscuitsandgravy.ai

### M1: Public-ready Landing ✅
- Created minimalist hero page with chip-min.png image
- Set up navbar (Projects, Research, Contact)
- Created custom 404 page
- Configured www → apex domain redirect via Cloudflare Page Rule

## Key Design Decisions
1. **Font sizes**: After multiple iterations, settled on:
   - Title: 1.4rem
   - Tagline: 1.1rem
   - Using inline styles in index.qmd header to override theme

2. **Hero page elements**:
   - Chip image (250px wide, grayscale filter)
   - "Kevin Scott" name
   - "AI Systems & Performance Engineering" tagline
   - "Making AI systems faster, cheaper, and more scalable" subtitle
   - Navigation links: Projects, Research, Contact
   - Social icons: Email, LinkedIn, GitHub (3rem spacing)

3. **Content created**:
   - First blog post on dimension reduction (co-authored with Ethan Davis)
   - Projects page with SketchRAG, MetaChunk, GraphAgent
   - Contact page with professional info

## Technical Configuration
- GitHub repo: kevin-lyle-scott/biscuitsandgravy-site
- Deployment: GitHub Actions (not branch deployment)
- Output directory: root (not /docs)
- Theme: Zephyr with custom styles.css
- DNS: 4 A records + www CNAME in Cloudflare
- SSL: Full encryption mode in Cloudflare

## User Preferences
- Professional tone, no emoticons or "cheesy" elements
- Accurate technical content (e.g., SVD not PCA for embeddings)
- Clean, minimalist design
- Kevin's details:
  - Email: klscott.learning@gmail.com
  - LinkedIn: linkedin.com/in/kevin-scott-9361315/
  - GitHub: github.com/kevin-lyle-scott

## Next Tasks (M2-M4)
- M2-3: Set up resume rendering to HTML & PDF
- M2-4: Configure Cloudflare cache rules
- M3: Theme, dark mode, search, tags, analytics
- M4: Automation, RSS, social images, contact form

## Recent Issue Resolutions
1. Font size not updating: Fixed by removing conflicting CSS and using inline styles
2. GitHub Pages 404: Fixed by enabling Actions deployment and adding CNAME file
3. www redirect: Fixed with Cloudflare Page Rule (www.biscuitsandgravy.ai/* → https://biscuitsandgravy.ai/$1)

## Commands to Remember
- Build: `quarto render`
- Local preview: `quarto preview`
- Git workflow: Already configured with SSH keys

Last session ended: June 30, 2025