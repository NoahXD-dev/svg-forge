<style>
    :root {
        --bg: #0c0c0e;
        --panel: #131316;
        --panel2: #1a1a1f;
        --border: #2a2a35;
        --accent: #e8ff4e;
        --accent2: #4ef5ff;
        --accent3: #ff6b6b;
        --text: #e8e8f0;
        --muted: #5a5a70;
        --canvas-bg: #16161c;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.5px;
    }

    .logo-icon {
        width: 28px;
        height: 28px;
        background: var(--accent);
        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        display: flex;
        align-items: center;            
        justify-content: center;
    }

    .logo span {
        color: var(--accent);
    }
</style>

<div class="logo">
    <div class="logo-icon"></div>
    SVG<span>Forge</span>
</div>

<hr>

<p align="center">
    <img src="https://img.shields.io/github/license/NoahXD-dev/svg-forge">
    <img src="https://img.shields.io/gitea/v/release/NoahXD-dev/svg-forge">
</p>