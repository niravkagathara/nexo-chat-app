import os
import sys
import subprocess

def install_pillow():
    print("Installing Pillow for image conversion...")
    try:
        # Run pip install Pillow
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        print("Pillow installed successfully!")
    except Exception as e:
        print(f"Error installing Pillow: {e}")
        print("Please install Pillow manually using: pip install Pillow")
        sys.exit(1)

# Check if PIL is available, if not try to install it
try:
    from PIL import Image
except ImportError:
    install_pillow()
    from PIL import Image

def generate_icons():
    # Define absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "public", "logo-icon.png"))
    build_dir = os.path.join(script_dir, "build")
    
    # If frontend/public/logo-icon.png doesn't exist, try frontend/src/app/icon.png
    if not os.path.exists(source_path):
        source_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "src", "app", "icon.png"))
        
    if not os.path.exists(source_path):
        print(f"Error: Source icon not found at {source_path}")
        sys.exit(1)
        
    if not os.path.exists(build_dir):
        os.makedirs(build_dir)
        print(f"Created build directory: {build_dir}")
        
    print(f"Opening source icon from: {source_path}")
    img = Image.open(source_path)
    
    # Ensure color profile is RGB/RGBA for conversion
    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGBA')
    
    # 1. Save PNG icon (512x512)
    png_path = os.path.join(build_dir, "icon.png")
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(png_path, "PNG")
    print(f"Generated PNG icon: {png_path}")
    
    # 2. Save ICO icon (for Windows build)
    ico_path = os.path.join(build_dir, "icon.ico")
    # Multi-resolution ICO sizes for Windows shortcut, taskbar, and installer
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img_512.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated ICO icon: {ico_path}")
    
    # 3. Save ICNS icon (for macOS support)
    icns_path = os.path.join(build_dir, "icon.icns")
    try:
        img_512.save(icns_path, format="ICNS")
        print(f"Generated ICNS icon: {icns_path}")
    except Exception as e:
        print(f"Note: Could not generate ICNS file (Pillow support for ICNS varies): {e}")

if __name__ == "__main__":
    generate_icons()
