# 💬 Professional Chat Widget

A beautiful, customizable live chat widget for websites. Easy integration, production-ready, and fully responsive.

## 🚀 Quick Start

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   cd chat-widget
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project? **No**
   - Project name: **chat-widget** (or your preferred name)
   - Directory: **./public** 
   - Deploy? **Yes**

### Option 2: GitHub Integration

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial chat widget deployment"
   git remote add origin https://github.com/yourusername/chat-widget.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Deploy automatically

## 📁 Project Structure

```
chat-widget/
├── public/                    # Static files served by Vercel
│   ├── js/
│   │   └── chatwidget.js     # Main widget file (clean name!)
│   ├── docs/
│   │   ├── config-generator.html
│   │   └── integration-guide.html
│   └── index.html            # Landing page
├── vercel.json               # Vercel configuration
├── package.json              # Project metadata
└── README.md                 # This file
```

## 🌐 URLs After Deployment

Once deployed, your widget will be available at:

- **Main widget:** `https://your-project.vercel.app/chatwidget.js`
- **Alternative:** `https://your-project.vercel.app/widget.js`
- **Config tool:** `https://your-project.vercel.app/docs/config-generator.html`
- **Documentation:** `https://your-project.vercel.app/docs/integration-guide.html`

## 🎯 Client Integration

Your clients can integrate the widget with:

```html
<script 
  src="https://your-project.vercel.app/chatwidget.js"
  data-client-id="client_id"
  data-client-name="Business Name"
  data-primary-color="#2563eb">
</script>
```

## 🔧 Custom Domain Setup

### 1. Add Domain in Vercel Dashboard
```bash
vercel domains add widgets.yourdomain.com
```

### 2. Configure DNS
Add a CNAME record:
```
widgets.yourdomain.com → cname.vercel-dns.com
```

### 3. Client Integration with Custom Domain
```html
<script src="https://widgets.yourdomain.com/chatwidget.js"></script>
```

## 📊 Features

- ✅ **Professional naming** (no "optimized" suffix)
- ✅ **Global CDN** via Vercel
- ✅ **Custom domains** supported
- ✅ **HTTPS by default**
- ✅ **Automatic caching** (24h for JS files)
- ✅ **CORS configured** for cross-origin requests
- ✅ **Mobile responsive**
- ✅ **Dark/light themes**
- ✅ **Error handling & retry logic**
- ✅ **Material Icons integration**
- ✅ **Logo support**
- ✅ **Configuration generator**

## 🛠️ Development

### Local Development
```bash
npm run dev          # Start Vercel dev server
npm run preview      # Create preview deployment  
npm run deploy       # Deploy to production
```

### File Updates
After updating `chatwidget.js`, just redeploy:
```bash
vercel --prod
```

## 📈 Monitoring

Vercel provides built-in analytics:
- Request volume
- Response times  
- Geographic distribution
- Error rates

Access at: `https://vercel.com/dashboard/analytics`

## 🔒 Security

- All files served over HTTPS
- CORS properly configured
- Content Security Policy headers
- No sensitive data exposure

## 💡 Pro Tips

1. **Use custom domain** for professional branding
2. **Monitor analytics** to track usage
3. **Version your releases** using git tags
4. **Test on staging** before production deployments
5. **Keep backups** of working versions

## 🆘 Troubleshooting

### Widget not loading?
- Check browser console for errors
- Verify the script URL is correct
- Ensure CORS is not blocking the request

### Styling issues?
- Check if client site has conflicting CSS
- Verify Material Icons are loading
- Test in incognito mode

### Need support?
- Check the integration guide
- Use the config generator for testing
- Review browser network tab for errors

---

**Your professional chat widget is now ready for deployment! 🎉**