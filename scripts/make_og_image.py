from PIL import Image, ImageDraw, ImageFont

# Create a dark background image (1200x630)
width, height = 1200, 630
img = Image.new("RGBA", (width, height), (8, 13, 26, 255)) # #080d1a
draw = ImageDraw.Draw(img)

# Draw a nice radial gradient/glow at the center top
for r in range(350, 0, -5):
    alpha = int((350 - r) / 350 * 50) # soft blue glow
    draw.ellipse((width//2 - r, -150 - r, width//2 + r, -150 + r), fill=(14, 165, 233, alpha))

# Set up clean Ubuntu fonts
font_title_path = "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf"
font_sub_path = "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf"

try:
    font_title = ImageFont.truetype(font_title_path, 84)
    font_sub = ImageFont.truetype(font_sub_path, 36)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

# Draw title "Rivalscope"
draw.text((width//2, height//2 - 50), "Rivalscope", fill=(255, 255, 255, 255), anchor="mm", font=font_title)

# Draw subtitle
draw.text((width//2, height//2 + 60), "Competitor Intelligence for SaaS Founders", fill=(148, 163, 184, 255), anchor="mm", font=font_sub)

# Draw border
draw.rectangle((0, 0, width-1, height-1), outline=(56, 189, 248, 20), width=2) # subtle border

# Save image
output_path = "/var/www/html/competitor-analyzer/frontend/public/og-image.png"
img.save(output_path, "PNG")
print(f"Saved OG image to {output_path}")
