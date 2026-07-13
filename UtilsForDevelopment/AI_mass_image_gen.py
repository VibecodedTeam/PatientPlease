#!/usr/bin/env python3
"""
naga_image_gen.py
-----------------
Generuje N obrazów przez API naga.ac (OpenAI-compatible).

Potok (pipeline) dla każdego obrazu:
    1. Mały LLM (text model) dostaje FEATURE_GENERATION_SYSTEM_PROMPT i generuje
       WYŁĄCZNIE cechy pacjenta (wiek, płeć, kolor oczu/włosów, karnacja, ubranie...).
       Nie generuje stylu obrazu — to zapewnia spójność stylistyczną (stylistic
       consistency) między wszystkimi wygenerowanymi obrazami.
    2. Cechy pacjenta są doklejane do STAŁEGO style_prompt (zdefiniowanego przez
       użytkownika w CONFIG) -> powstaje finalny prompt obrazowy.
    3. Finalny prompt trafia do modelu obrazowego (image model), który renderuje obraz.
    4. Obraz jest zapisywany jako .png, a finalny prompt jako .txt o tej samej nazwie.

Klucz API czytany z zmiennej środowiskowej NAGA_API_KEY.
Zależności: requests   ->   pip install requests
"""

import base64
import os
import re
import sys
import time
import json
import pathlib
import datetime
from typing import Optional

import requests

# ============================================================
#  SEKCJA CONFIG
# ============================================================
CONFIG = {
    # --- Endpoint ---
    "base_url": "https://api.naga.ac/v1",  # bazowy URL API (OpenAI-compatible)
    "api_key_env": "NAGA_API_KEY",  # nazwa zmiennej środowiskowej z kluczem
    # --- Ile obrazów ---
    "n_images": 10,  # liczba obrazów do wygenerowania
    # --- Model tekstowy (mały LLM generujący TYLKO cechy pacjenta) ---
    "text_model": "deepseek-v4-pro",  # tani/szybki model do generacji cech
    "text_temperature": 1.1,  # wysoka -> większa różnorodność cech pacjenta
    "text_max_tokens": 150,
    # --- Model obrazowy ---
    "image_model": "qwen-image",  # np. dall-e-3, flux-1-dev, sdxl ...
    "image_size": "680x340",
    "image_response_format": "url",  # "url" albo "b64_json"
    # --- STYL OBRAZU: stały dla WSZYSTKICH obrazów, zapewnia spójność stylistyczną.
    #     Ten fragment NIE jest generowany przez LLM — użytkownik definiuje go raz,
    #     a skrypt doklei do niego wygenerowane przez LLM cechy pacjenta. ---
    "style_prompt": (
        "Portrait bust of a patient, cubist painting style, fragmented "
        "geometric planes, neutral facial "
        "expression, looking directly into the camera, frontal pose, "
        "transparent background, painterly brushstroke texture. color scheme:#A89E96 #384254  #193447 #212129 #531516 073B33"
    ),
    # --- System prompt dla małego LLM: generuje WYŁĄCZNIE cechy pacjenta,
    #     bez żadnych odniesień do stylu artystycznego (to robi style_prompt). ---
    "feature_generation_system_prompt": (
        "Jesteś generatorem opisów cech fizycznych fikcyjnego pacjenta, "
        "przeznaczonych do wklejenia do promptu text-to-image. "
        "Zwróć WYŁĄCZNIE krótki, przecinkowo oddzielony opis (w języku angielskim) "
        "następujących cech: wiek (age), płeć (gender), rysy twarzy (facial features), "
        "fryzura (hairstyle), kolor włosów (hair color), kolor oczu (eye color), "
        "karnacja/odcień skóry (skin tone), ubranie (clothing). "
        "NIE opisuj stylu artystycznego, kompozycji, oświetlenia, tła ani ujęcia — "
        "to jest już ustalone poza Twoim zadaniem. "
        "Nie dodawaj żadnych cudzysłowów, numeracji, nagłówków ani komentarzy — "
        "tylko sam opis cech."
    ),
    # --- Wyjście ---
    "output_dir": "generated_images",  # katalog na obrazy i pliki .txt z promptami
    # --- Odporność (resilience) ---
    "request_timeout": 120,  # sekundy
    "max_retries": 3,  # ile razy ponawiać zapytanie po błędzie
    "retry_backoff": 4.0,  # bazowe opóźnienie (sek) między próbami
    "delay_between_images": 0.0,  # przerwa między kolejnymi obrazami
}
# ============================================================


def get_api_key() -> str:
    key = os.environ.get(CONFIG["api_key_env"])
    if not key:
        sys.exit(
            f"[BŁĄD] Brak klucza API w zmiennej środowiskowej ${CONFIG['api_key_env']}."
        )
    return key


def _headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _post_with_retry(url: str, headers: dict, payload: dict) -> dict:
    """POST z prostym backoffem wykładniczym."""
    last_err: Optional[Exception] = None
    for attempt in range(1, CONFIG["max_retries"] + 1):
        try:
            resp = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=CONFIG["request_timeout"],
            )
            if resp.status_code == 200:
                return resp.json()
            # 429 / 5xx -> warto ponowić
            if resp.status_code in (429, 500, 502, 503, 504):
                last_err = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            else:
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")
        except requests.RequestException as e:
            last_err = e

        if attempt < CONFIG["max_retries"]:
            sleep_s = CONFIG["retry_backoff"] * attempt
            print(f"   ...próba {attempt} nieudana, ponawiam za {sleep_s:.0f}s")
            time.sleep(sleep_s)

    raise RuntimeError(
        f"Zapytanie do {url} nieudane po {CONFIG['max_retries']} próbach: {last_err}"
    )


def generate_patient_features(api_key: str, index: int) -> str:
    """Mały LLM generuje WYŁĄCZNIE cechy pacjenta (bez stylu obrazu)."""
    url = f"{CONFIG['base_url']}/chat/completions"
    payload = {
        "model": CONFIG["text_model"],
        "temperature": CONFIG["text_temperature"],
        "max_tokens": CONFIG["text_max_tokens"],
        "messages": [
            {"role": "system", "content": CONFIG["feature_generation_system_prompt"]},
            # ziarno (seed) wymuszające inny wynik przy każdym wywołaniu:
            {
                "role": "user",
                "content": f"Wariant #{index}. Wygeneruj nowy, odmienny zestaw cech pacjenta.",
            },
        ],
    }
    data = _post_with_retry(url, _headers(api_key), payload)
    features = data["choices"][0]["message"]["content"].strip()
    # oczyszczenie z ewentualnych cudzysłowów na krańcach
    return features.strip('"').strip()


def build_final_prompt(patient_features: str) -> str:
    """Łączy stały style_prompt z cechami pacjenta -> finalny prompt obrazowy.

    Styl jest zawsze identyczny dla każdego obrazu (spójność stylistyczna),
    zmienne są tylko cechy pacjenta.
    """
    return f"{CONFIG['style_prompt']} Patient: {patient_features}"


def generate_image(api_key: str, final_prompt: str) -> bytes:
    """Model obrazowy renderuje obraz -> zwraca surowe bajty PNG/JPEG."""
    url = f"{CONFIG['base_url']}/images/generations"
    payload = {
        "model": CONFIG["image_model"],
        "prompt": final_prompt,
        "n": 1,
        "size": CONFIG["image_size"],
        "response_format": CONFIG["image_response_format"],
    }
    data = _post_with_retry(url, _headers(api_key), payload)
    item = data["data"][0]

    if "b64_json" in item and item["b64_json"]:
        return base64.b64decode(item["b64_json"])
    if "url" in item and item["url"]:
        img = requests.get(item["url"], timeout=CONFIG["request_timeout"])
        img.raise_for_status()
        return img.content
    raise RuntimeError(
        f"Odpowiedź nie zawiera ani 'url' ani 'b64_json': {json.dumps(item)[:300]}"
    )


def _slugify(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return slug[:max_len] or "image"


def main() -> None:
    api_key = get_api_key()
    out_dir = pathlib.Path(CONFIG["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    n = CONFIG["n_images"]
    print(f"Generuję {n} obraz(ów) -> {out_dir.resolve()}\n")

    ok, fail = 0, 0
    for i in range(1, n + 1):
        print(f"[{i}/{n}] Generuję cechy pacjenta...")
        try:
            features = generate_patient_features(api_key, i)
            print(f"   cechy: {features[:110]}{'...' if len(features) > 110 else ''}")

            final_prompt = build_final_prompt(features)

            print("   renderuję obraz...")
            img_bytes = generate_image(api_key, final_prompt)

            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            base_name = f"{i:03d}_{_slugify(features)}_{ts}"

            png_path = out_dir / f"{base_name}.png"
            txt_path = out_dir / f"{base_name}.txt"

            png_path.write_bytes(img_bytes)
            txt_path.write_text(final_prompt, encoding="utf-8")

            print(f"   zapisano: {png_path.name} + {txt_path.name}\n")
            ok += 1
        except Exception as e:
            print(f"   [BŁĄD] {e}\n")
            fail += 1

        if i < n:
            time.sleep(CONFIG["delay_between_images"])

    print(f"Gotowe. Sukcesy: {ok}, błędy: {fail}.")


if __name__ == "__main__":
    main()
