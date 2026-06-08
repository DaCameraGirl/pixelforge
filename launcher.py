"""
PixelForge - Desktop Launcher
Styled tkinter hub that launches each engine demo.
Run: python launcher.py
"""

import os
import subprocess
import sys
import tkinter as tk
import webbrowser
from tkinter import messagebox

BASE = os.path.dirname(os.path.abspath(__file__))

BG = "#1a0a2e"
BG2 = "#120820"
CARD = "#1e0f35"
PURPLE = "#bf5fff"
ORANGE = "#ff6b35"
LIME = "#a8ff3e"
PINK = "#ff3d9a"
BLUE = "#3d9aff"
DIM = "#5a4870"

ENGINES = [
    {
        "name": "Pygame - Asteroid Field",
        "sub": "Python - asteroids, bullets, waves",
        "color": PURPLE,
        "action": "pygame",
        "badge": "pip install pygame-ce -> python demos/pygame/asteroid_field.py",
    },
    {
        "name": "Love2D - Neon Breakout",
        "sub": "Lua - breakout with physics",
        "color": LIME,
        "action": "love",
        "badge": "love demos/love2d/",
    },
    {
        "name": "Defold - Shooter Script",
        "sub": "Lua - game object + input script",
        "color": ORANGE,
        "action": "defold",
        "badge": "Open demos/defold/ in Defold Editor",
    },
    {
        "name": "MonoGame - Space Shooter",
        "sub": "C# - enemy waves, bullet collision",
        "color": BLUE,
        "action": "monogame",
        "badge": "dotnet run  (inside demos/monogame/)",
    },
    {
        "name": "Web Arcade - Five-Game Cabinet",
        "sub": "HTML/CSS/JS - mouse, touch, and keyboard controls",
        "color": PINK,
        "action": "web",
        "badge": "Opens index.html in your browser",
    },
]


def launch(action):
    if action == "pygame":
        script = os.path.join(BASE, "demos", "pygame", "asteroid_field.py")
        if not os.path.exists(script):
            messagebox.showerror("Not Found", f"Could not find:\n{script}")
            return
        try:
            subprocess.Popen([sys.executable, script])
        except Exception as exc:
            messagebox.showerror("Error", f"Failed to launch:\n{exc}\n\npip install pygame-ce")

    elif action == "love":
        folder = os.path.join(BASE, "demos", "love2d")
        messagebox.showinfo(
            "Love2D",
            f'Run this command:\n\nlove "{folder}"\n\nDownload Love2D at love2d.org if not installed.',
        )

    elif action == "defold":
        folder = os.path.join(BASE, "demos", "defold")
        messagebox.showinfo(
            "Defold",
            f"Open Defold Editor -> New Project -> attach game.script:\n\n{folder}\n\nDownload Defold at defold.com",
        )

    elif action == "monogame":
        folder = os.path.join(BASE, "demos", "monogame")
        messagebox.showinfo(
            "MonoGame",
            f'In a terminal:\n\ncd "{folder}"\n'
            "dotnet new mgdesktopgl -n PixelForgeDemo\n"
            "(replace Game1.cs with the file here)\n"
            "dotnet run\n\nRequires .NET SDK + MonoGame templates.",
        )

    elif action == "web":
        html = os.path.join(BASE, "index.html")
        webbrowser.open(f"file:///{html.replace(os.sep, '/')}")


def build_ui():
    root = tk.Tk()
    root.title("PixelForge - Launcher")
    root.configure(bg=BG)
    root.resizable(False, False)

    hdr = tk.Frame(root, bg=BG2, pady=14)
    hdr.pack(fill=tk.X)
    tk.Label(hdr, text="PIXELFORGE", font=("Courier New", 20, "bold"), bg=BG2, fg=PURPLE).pack()
    tk.Label(hdr, text="// GAME ENGINE LAUNCHER II //", font=("Courier New", 9), bg=BG2, fg=DIM).pack(
        pady=(2, 0)
    )

    tk.Frame(root, bg=PURPLE, height=2).pack(fill=tk.X)

    cards_frame = tk.Frame(root, bg=BG, padx=24, pady=18)
    cards_frame.pack(fill=tk.BOTH, expand=True)

    for eng in ENGINES:
        card = tk.Frame(cards_frame, bg=CARD, padx=14, pady=12, highlightbackground=eng["color"], highlightthickness=1)
        card.pack(fill=tk.X, pady=5)

        left = tk.Frame(card, bg=CARD)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        tk.Label(left, text=eng["name"], font=("Courier New", 12, "bold"), bg=CARD, fg=eng["color"], anchor="w").pack(
            fill=tk.X
        )
        tk.Label(left, text=eng["sub"], font=("Courier New", 9), bg=CARD, fg=DIM, anchor="w").pack(fill=tk.X)
        tk.Label(
            left,
            text=eng["badge"],
            font=("Courier New", 8),
            bg=CARD,
            fg="#2a1a4a",
            anchor="w",
            wraplength=380,
            justify="left",
        ).pack(fill=tk.X, pady=(3, 0))

        btn = tk.Button(
            card,
            text="LAUNCH",
            font=("Courier New", 9, "bold"),
            bg=CARD,
            fg=eng["color"],
            activebackground=eng["color"],
            activeforeground=BG,
            relief=tk.FLAT,
            bd=1,
            highlightbackground=eng["color"],
            highlightthickness=1,
            padx=14,
            pady=7,
            cursor="hand2",
            command=lambda a=eng["action"]: launch(a),
        )
        btn.pack(side=tk.RIGHT, padx=(10, 0))

    tk.Frame(root, bg=PINK, height=2).pack(fill=tk.X)
    tk.Label(root, text="Angela Hudson  -  PixelForge  -  2026", font=("Courier New", 8), bg=BG2, fg=DIM, pady=7).pack(
        fill=tk.X
    )

    root.update_idletasks()
    w, h = root.winfo_width(), root.winfo_height()
    x = (root.winfo_screenwidth() - w) // 2
    y = (root.winfo_screenheight() - h) // 2
    root.geometry(f"+{x}+{y}")
    root.mainloop()


if __name__ == "__main__":
    build_ui()
