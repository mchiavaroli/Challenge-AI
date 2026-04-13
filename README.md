# Modello di Pulizia Vetrate — Guida Tecnica

Questo documento spiega come funziona il sistema che **addestra un modello di intelligenza artificiale** capace di analizzare fotografie di vetrate (ad esempio pannelli solari) e assegnare un **punteggio di pulizia da 0 a 100**.

---

## Panoramica

Il sistema è composto da tre fasi principali:

```
1. Etichettatura automatica    →    2. Addestramento modello    →    3. Predizione in produzione
   (label_images.py)                   (train.py)                     (main.py)
```

1. **Etichettatura**: ogni immagine nel dataset riceve un punteggio di pulizia calcolato con analisi visiva tradizionale.
2. **Addestramento**: una rete neurale impara ad associare le immagini ai punteggi.
3. **Predizione**: il modello addestrato viene esposto tramite un'API web e può analizzare nuove immagini in tempo reale.

---

## Fase 1 — Etichettatura automatica delle immagini

> **Script**: `label_images.py`

Prima di addestrare il modello, ogni immagine ha bisogno di un'"etichetta" — ovvero un punteggio numerico che indica quanto il vetro è pulito.

Anziché annotare manualmente centinaia di foto, lo script analizza ogni immagine con **cinque indicatori visivi** e combina i risultati in un punteggio unico:

| Indicatore | Cosa misura | Peso |
|---|---|---|
| **Saturazione del colore** | Vetro pulito = colori intensi (blu profondo). Vetro sporco = colori sbiaditi e grigi. | 30% |
| **Pixel luminosi / bianchi** | Polvere e sporco appaiono come macchie bianche brillanti sull'immagine. | 20% |
| **Dominanza del blu** | Un pannello pulito riflette un blu più marcato rispetto a uno coperto di polvere. | 20% |
| **Nitidezza dei bordi** | Vetro pulito mostra linee e bordi netti; lo sporco rende l'immagine più sfocata. | 15% |
| **Foschia grigia** | Più l'immagine contiene zone grigiastre a bassa saturazione, più il vetro è sporco. | 15% |

Ogni indicatore produce un valore da 0 a 100, che viene moltiplicato per il proprio peso. La somma finale rappresenta il punteggio di pulizia dell'immagine.
Nota bene: è estata fatta anche una ricerca e classificazione delle immagini in maniera manuale.

### Come eseguirlo

```bash
cd python
python label_images.py
```

**Input richiesto**: cartella `dataset/train/` contenente le immagini (`.jpg`, `.png`, ecc.).

**Output**: file `dataset/labels.csv` con due colonne:

```csv
filename,score
image_001.jpg,85.3
image_002.jpg,27.1
```

---

## Fase 2 — Addestramento del modello

> **Script**: `train.py` &nbsp;|&nbsp; **Architettura**: `model.py`

### Cos'è il modello

Si utilizza **EfficientNet-B0**, una rete neurale convoluzionale (CNN) progettata per analizzare immagini in modo efficiente. Questa rete è composta da due parti:

```
┌─────────────────────────────────┐
│   Backbone (feature extractor)  │  ← Estrae caratteristiche visive dall'immagine
│   EfficientNet-B0               │    (bordi, texture, colori, forme...)
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Classifier head               │
│   Dropout(0.2)                  │  ← Previene l'overfitting
│   Linear(1280 → 1)             │  ← Produce un singolo numero
│   Sigmoid()                     │  ← Lo comprime tra 0 e 1
└─────────────────────────────────┘
               │
               ▼
         Punteggio 0–1
       (scalato a 0–100)
```

### Transfer Learning

Addestrare una rete neurale da zero richiederebbe milioni di immagini. Per evitarlo, il backbone viene **pre-caricato con pesi addestrati su ImageNet** — un database di oltre 1 milione di immagini. In questo modo la rete "sa già" riconoscere forme, colori e texture generiche, e deve solo imparare a valutare la pulizia dei vetri.

### Preparazione delle immagini

Prima di essere elaborate dal modello, tutte le immagini vengono trasformate:

**Durante il training** (con data augmentation per aumentare la varietà):
- Ridimensionamento a 256×256 pixel
- Ritaglio casuale di una porzione 224×224
- Ribaltamento orizzontale casuale
- Variazione casuale di luminosità, contrasto e saturazione (±20%)
- Normalizzazione dei colori secondo lo standard ImageNet

**Durante la validazione** (senza modifiche casuali):
- Ridimensionamento diretto a 224×224 pixel
- Normalizzazione ImageNet

### Parametri di addestramento

| Parametro | Valore | Significato |
|---|---|---|
| **Epoche** | 20 | Numero di volte in cui il modello vede l'intero dataset |
| **Batch size** | 16 | Quante immagini vengono elaborate contemporaneamente |
| **Learning rate** | 0.0001 | Velocità con cui il modello aggiorna i propri pesi |
| **Validation split** | 20% | Percentuale di immagini riservata alla validazione |
| **Loss function** | MSE | Errore quadratico medio tra punteggio previsto e reale |
| **Ottimizzatore** | Adam | Algoritmo che decide come aggiornare i pesi |
| **LR Scheduler** | ReduceLROnPlateau | Se la performance non migliora per 3 epoche consecutive, il learning rate viene dimezzato |

### Come funziona un'epoca di training

Per ogni epoca, il modello esegue i seguenti passi:

1. **Training**: per ogni gruppo di 16 immagini (batch):
   - Il modello predice un punteggio per ciascuna immagine
   - Si calcola l'errore rispetto al punteggio corretto (MSE loss)
   - L'errore viene propagato all'indietro nella rete (backpropagation) per calcolare quanto ogni peso ha contribuito all'errore
   - I pesi vengono aggiornati per ridurre l'errore futuro

2. **Validazione**: le immagini del set di validazione (mai viste durante il training) vengono valutate per misurare la performance reale del modello.

3. **Salvataggio**: se la loss di validazione è la migliore ottenuta finora, il modello viene salvato su disco.

### Come eseguirlo

```bash
cd python
python train.py
```

**Prerequisiti**:
- File `dataset/labels.csv` generato dalla Fase 1
- Immagini nella cartella `dataset/train/`
- Dipendenze Python installate (`pip install -r requirements.txt`)
- GPU consigliata ma non obbligatoria (il training funziona anche su CPU, più lentamente)

**Output**: file `weights/cleanliness_model.pth` contenente i pesi addestrati del modello.

---

## Fase 3 — Predizione tramite API

> **Script**: `main.py`

Una volta addestrato, il modello viene servito tramite un server **FastAPI**. All'avvio, il server carica i pesi da `weights/cleanliness_model.pth`.

### Endpoint principale

```
POST /predict
```

**Request body**:
```json
{
  "image_urls": [
    "https://example.com/vetrata_1.jpg",
    "https://example.com/vetrata_2.jpg"
  ]
}
```

**Response**:
```json
{
  "scores": [82.5, 45.3],
  "average": 63.9,
  "model_loaded": true
}
```

Il server scarica ogni immagine, applica lo stesso preprocessing usato in validazione (resize 224×224 + normalizzazione), esegue l'inferenza e restituisce il punteggio moltiplicato per 100.

> Se il modello non è ancora stato addestrato, l'API restituisce punteggi casuali e il campo `model_loaded` sarà `false`.

### Avvio del server

```bash
cd python
uvicorn main:app --reload --port 8000
```

---

## Avvio web app

```bash
pnpm dev
```

## Struttura dei file

```
python/
├── label_images.py         # Fase 1: genera le etichette automatiche
├── train.py                # Fase 2: addestra il modello
├── model.py                # Definizione architettura + funzione di inferenza
├── main.py                 # Fase 3: server API FastAPI
├── requirements.txt        # Dipendenze Python
├── dataset/
│   ├── train/              # Immagini di training
│   └── labels.csv          # Etichette generate (filename, score)
└── weights/
    └── cleanliness_model.pth   # Pesi del modello addestrato
```

---

## Note importanti

- **Il modello esegue una regressione**, non una classificazione: predice un valore continuo (0–100), non una categoria discreta (es. "pulito" / "sporco").
- **Tutto il modello viene aggiornato** durante il training (fine-tuning completo), non solo il classifier head. Questo permette al backbone di adattarsi meglio al dominio specifico delle vetrate.
- Con poche immagini, il modello potrebbe soffrire di **overfitting** (memorizza il training set anziché generalizzare). La data augmentation e il dropout servono a mitigare questo rischio.