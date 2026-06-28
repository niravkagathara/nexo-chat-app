import os
import sys
import subprocess

def install_pillow():
    print("Installing Pillow for image conversion...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        print("Pillow installed successfully!")
    except Exception as e:
        print(f"Error installing Pillow: {e}")
        sys.exit(1)

try:
    from PIL import Image, ImageDraw
except ImportError:
    install_pillow()
    from PIL import Image, ImageDraw

def create_round_image(img):
    # Create circular mask
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + img.size, fill=255)
    
    # Create output image with transparency
    round_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
    round_img.paste(img, (0, 0), mask=mask)
    return round_img

def generate_mobile_icons():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "public", "logo-icon.png"))
    res_dir = os.path.join(script_dir, "app", "src", "main", "res")
    
    if not os.path.exists(source_path):
        print(f"Error: Source icon not found at {source_path}")
        sys.exit(1)
        
    print(f"Opening source icon from: {source_path}")
    src_img = Image.open(source_path)
    if src_img.mode not in ('RGB', 'RGBA'):
        src_img = src_img.convert('RGBA')
        
    # Android launcher icon dimensions
    resolutions = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    for folder, size in resolutions.items():
        folder_path = os.path.join(res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        # 1. Standard square/rectangle launcher icon
        square_img = src_img.resize((size, size), Image.Resampling.LANCZOS)
        square_path = os.path.join(folder_path, "ic_launcher.png")
        square_img.save(square_path, "PNG")
        print(f"Generated square icon: {square_path}")
        
        # 2. Circular round launcher icon
        round_img = create_round_image(square_img)
        round_path = os.path.join(folder_path, "ic_launcher_round.png")
        round_img.save(round_path, "PNG")
        print(f"Generated round icon: {round_path}")

if __name__ == "__main__":
    generate_mobile_icons()
