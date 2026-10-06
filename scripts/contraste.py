#!/usr/bin/env python3
"""Verificador de contraste WCAG 2.x (nivel AA) para la interfaz de Veta.

Adaptado de contrast-check.py de la skill antislop-human (antislop v3.2.20):
misma fórmula; la tabla de referencia vive aquí porque la skill ya no está en el proyecto.

Uso:
    npm run contraste -- "#FFFFFF" "#777777"
    python3 scripts/contraste.py FFFFFF 777777
    python3 scripts/contraste.py --autoprueba

Imprime la razón de contraste y si pasa para texto normal (4.5:1) y para texto
grande, de 24px o más (3:1). Sale con código 0 solo si pasan los dos, para poder
encadenarlo en otros scripts. Solo usa la biblioteca estándar; no usa red ni escribe archivos.
"""

import re
import sys

NOMBRADOS = {"negro": (0, 0, 0), "blanco": (255, 255, 255), "black": (0, 0, 0), "white": (255, 255, 255)}

# Pares de referencia (texto sobre fondo, razón esperada) para la autoprueba de la fórmula.
REFERENCIA = [
    ("#000000", "#FFFFFF", 21.00),
    ("#FFFFFF", "#000000", 21.00),
    ("#FFFFFF", "#333333", 12.63),
    ("#FFFFFF", "#666666", 5.74),
    ("#777777", "#FFFFFF", 4.48),
    ("#FFFFFF", "#888888", 3.54),
    ("#FFFFFF", "#999999", 2.85),
    ("#555555", "#000000", 2.82),
]


def leer_color(valor):
    nombre = valor.strip().lower()
    if nombre in NOMBRADOS:
        return NOMBRADOS[nombre]
    valor = valor.strip().lstrip("#")
    if len(valor) == 3:
        valor = "".join(c * 2 for c in valor)
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", valor):
        raise ValueError(f"se esperaba un color hex como #FFFFFF, llegó {valor!r}")
    return tuple(int(valor[i:i + 2], 16) for i in (0, 2, 4))


def linealizar(canal):
    c = canal / 255.0
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def luminancia(rgb):
    r, g, b = (linealizar(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def razon_contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    clara, oscura = sorted((la, lb), reverse=True)
    return (clara + 0.05) / (oscura + 0.05)


def autoprueba():
    fallas = 0
    for texto, fondo, esperada in REFERENCIA:
        calculada = round(razon_contraste(leer_color(texto), leer_color(fondo)), 2)
        if f"{calculada:.2f}" != f"{esperada:.2f}":
            fallas += 1
            print(f"autoprueba: {texto} sobre {fondo}: se esperaba {esperada:.2f}, la fórmula da {calculada:.2f}")
    if fallas:
        return 1
    print(f"autoprueba: {len(REFERENCIA)} pares de referencia correctos")
    return 0


def main(argv):
    if argv in (["--autoprueba"], ["--selftest"]):
        return autoprueba()
    if len(argv) != 2:
        print('uso: npm run contraste -- "#texto" "#fondo"   |   --autoprueba')
        return 2
    try:
        razon = razon_contraste(leer_color(argv[0]), leer_color(argv[1]))
    except ValueError as exc:
        print(f"error: {exc}")
        return 2

    normal = razon >= 4.5
    grande = razon >= 3.0
    print(f"razón: {razon:.2f}:1")
    print(f"texto normal        (4.5:1): {'PASA' if normal else 'NO PASA'}")
    print(f"texto grande ≥24px  (3.0:1): {'PASA' if grande else 'NO PASA'}")
    return 0 if normal and grande else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
