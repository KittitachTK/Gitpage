---
course: "[[Data Science]]"
code: CP352101
type: lab
chapters: "8"
related:
  - "[[เฉลยแบบทดสอบ บท 7-8]]"
tags:
  - data-science
  - CP352101
  - lab
---

# คู่มืออธิบาย `starter_lab.ipynb`

เอกสารนี้สรุปแนวคิดและอธิบายโค้ดในโน้ตบุ๊ก `quiz/starter_lab.ipynb` ทีละส่วน ใช้ภาษาไทยและตัวอย่างจากตัวแปรในโน้ตบุ๊ก เพื่อให้อ่านทบทวนได้โดยไม่ต้องเดาความหมายของ syntax

> หมายเหตุ: ค่าผลลัพธ์ตัวเลขจะปรากฏเมื่อรันโน้ตบุ๊กในสภาพแวดล้อมที่ติดตั้งแพ็กเกจครบ เอกสารนี้อธิบายว่าคำนวณอะไรและอ่านผลอย่างไร โดยไม่สมมติค่าที่ไม่ได้รัน

## 1. ภาพรวมของงาน

งานนี้ใช้ข้อมูลจำลองการใช้พลังงานรายวัน มีตัวแปรสำคัญดังนี้

| คอลัมน์ | ความหมาย | บทบาท |
|---|---|---|
| `date` | วันที่ | ใช้เรียงลำดับและตรวจแนวโน้มตามเวลา |
| `temp_forecast_c` | อุณหภูมิที่พยากรณ์ไว้ก่อนวันใช้งาน หน่วย °C | ตัวแปรอธิบาย (feature) |
| `working_day` | วันทำการเป็น 1 วันหยุดเป็น 0 | ตัวแปรอธิบายแบบตัวบ่งชี้ (indicator) |
| `energy_kwh` | พลังงานที่ใช้จริง หน่วย kWh | เป้าหมายที่ต้องการทำนาย (target) |

ลำดับข้อมูลสำคัญคือ **train → validation → final test**:

1. **Train** ใช้ประมาณพารามิเตอร์ของโมเดล
2. **Validation** ใช้เปรียบเทียบและเลือกโมเดล/การตั้งค่า
3. **Final test** เปิดใช้หลังเลือกโมเดลเสร็จแล้ว เพื่อประเมินครั้งสุดท้ายกับข้อมูลที่ไม่ได้ใช้เลือก

หากดูผล final test หลายครั้งแล้วกลับไปเลือกโมเดลจากผลนั้น ข้อมูล test ก็กลายเป็นส่วนหนึ่งของกระบวนการเลือก และคะแนนอาจดูดีเกินจริงเมื่อใช้กับข้อมูลใหม่

ข้อมูลในชุดฝึกมี 72 แถว validation 18 แถว รวม development 90 แถว ส่วน final test เป็นช่วงวันที่ถัดมา

## 2. เซลล์เริ่มต้น: นำเข้าแพ็กเกจและตรวจเวอร์ชัน

```python
import sys
import numpy as np
import pandas as pd
import sklearn
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
```

- `import ชื่อแพ็กเกจ as ชื่อย่อ` นำเข้าแพ็กเกจและตั้งชื่อสั้น ๆ เช่น `numpy` เป็น `np`, `pandas` เป็น `pd`
- `import sys` ใช้เข้าถึงข้อมูลสภาพแวดล้อม Python
- `matplotlib.pyplot` เรียกคำสั่งวาดกราฟ โดยนิยมตั้งชื่อ `plt`
- `from ... import ...` เลือกนำเข้าคลาส/ฟังก์ชันที่ต้องใช้โดยเรียกชื่อได้ตรง ๆ
- `LinearRegression` คือ linear regression แบบ least squares
- `Ridge` คือ linear regression ที่เพิ่ม regularization เพื่อลดขนาด coefficient
- `StandardScaler` ปรับ feature ให้มีค่าเฉลี่ยใกล้ 0 และส่วนเบี่ยงเบนมาตรฐานใกล้ 1
- `PolynomialFeatures` สร้าง feature ยกกำลัง เช่น x²
- `make_pipeline` ต่อขั้นตอนแปลงข้อมูลและโมเดลให้เป็นลำดับเดียวกัน
- `mean_absolute_error`, `mean_squared_error`, `r2_score` ใช้วัดคุณภาพการทำนาย

```python
print({'python': sys.version.split()[0], 'numpy': np.__version__,
       'pandas': pd.__version__, 'sklearn': sklearn.__version__})
```

วงเล็บปีกกา `{...}` สร้าง dictionary คู่ `key: value`; `print` แสดงออกทางหน้าจอ; `.split()[0]` แยกข้อความรุ่น Python ตามช่องว่างและหยิบรายการแรก; `__version__` คือหมายเลขเวอร์ชันของไลบรารี การบันทึกเวอร์ชันช่วยตรวจสอบความแตกต่างของสภาพแวดล้อมเมื่อผลรันไม่ตรงกัน

## 3. P01 — Simple และ Multiple Linear Regression

### แนวคิด

- **Simple linear regression** ใช้ feature เดียว คือ `temp_forecast_c`
- **Multiple linear regression** ใช้สอง feature คือ `temp_forecast_c` และ `working_day`

รูปแบบสมการอย่างย่อ:

- Simple: `พลังงาน = ค่าคงที่ + coefficient_อุณหภูมิ × อุณหภูมิ`
- Multiple: `พลังงาน = ค่าคงที่ + coefficient_อุณหภูมิ × อุณหภูมิ + coefficient_วันทำการ × วันทำการ`

โมเดลเรียนรู้ค่าคงที่และ coefficient จาก train โดยพยายามลดผลรวมความคลาดเคลื่อนกำลังสอง

### โหลดและแบ่งข้อมูล

```python
development = pd.read_csv('regression_development.csv', parse_dates=['date'])
train = development.iloc[:72].copy()
validation = development.iloc[72:].copy()
assert train.date.max() < validation.date.min()
assert len(train) == 72 and len(validation) == 18
display(development.head())
```

- `pd.read_csv(...)` อ่าน CSV เป็น DataFrame (ตารางของ pandas)
- `parse_dates=['date']` ขอให้ pandas แปลงคอลัมน์วันที่เป็นชนิดวันที่ แทนเก็บเป็นข้อความ
- `.iloc[:72]` เลือกแถวตามตำแหน่งตั้งแต่ต้นจนก่อนตำแหน่ง 72 จึงได้ 72 แถวแรก
- `.iloc[72:]` เลือกแถวตำแหน่ง 72 จนถึงท้ายตาราง
- `.copy()` สร้างสำเนาเพื่อแก้ไขตารางย่อยได้โดยไม่พึ่ง view ของตารางต้นทาง
- `assert เงื่อนไข` หยุดการทำงานพร้อม error หากเงื่อนไขไม่จริง ใช้ยืนยันว่าช่วง train มาก่อน validation และจำนวนแถวถูกต้อง
- `development.head()` แสดงตัวอย่าง 5 แถวแรก; `display` แสดงผลแบบตารางใน Jupyter

การแบ่งตามลำดับเวลาเลี่ยงการฝึกจากอนาคตแล้วไปทำนายอดีต ซึ่งจะทำให้การประเมินไม่เหมือนสถานการณ์ใช้งานจริง

### กำหนด feature และฟังก์ชันประเมิน

```python
features_simple = ['temp_forecast_c']
features_multiple = ['temp_forecast_c', 'working_day']
```

วงเล็บเหลี่ยมสร้าง list ของชื่อคอลัมน์ เมื่อเขียน `train[features]` pandas จะเลือกคอลัมน์เหล่านั้นเป็นตาราง feature

```python
def validation_scores(label, features):
    model = LinearRegression()
    model.fit(train[features], train['energy_kwh'])
    pred = model.predict(validation[features])
    return {'model': label,
            'MAE_kWh': mean_absolute_error(validation['energy_kwh'], pred),
            'RMSE_kWh': np.sqrt(mean_squared_error(validation['energy_kwh'], pred)),
            'R2': r2_score(validation['energy_kwh'], pred)}
```

- `def ชื่อฟังก์ชัน(พารามิเตอร์):` ประกาศฟังก์ชัน; บรรทัดที่เยื้องอยู่ด้านในเป็นเนื้อหาของฟังก์ชัน
- `LinearRegression()` สร้างโมเดลใหม่
- `.fit(X, y)` ฝึกโมเดลด้วย feature `X` และเป้าหมาย `y`
- `.predict(X)` ให้โมเดลคำนวณค่าทำนาย
- `return {...}` ส่งผลกลับเป็น dictionary
- `np.sqrt(...)` หารากที่สอง

ตัวชี้วัด:

- **MAE** = ค่าเฉลี่ยของ `|ค่าจริง − ค่าทำนาย|` อ่านตรง ๆ เป็นความคลาดเคลื่อนเฉลี่ย หน่วย kWh
- **RMSE** = รากที่สองของค่าเฉลี่ย `(ค่าจริง − ค่าทำนาย)²`; หน่วย kWh เช่นกัน และลงโทษความผิดพลาดขนาดใหญ่มากกว่า MAE
- **R²** เปรียบเทียบโมเดลกับการทำนายด้วยค่าเฉลี่ยของเป้าหมาย โดยทั่วไป 1 ดีที่สุด, 0 เทียบเท่าค่าเฉลี่ย, ค่าติดลบแปลว่าแย่กว่าค่าเฉลี่ยบนชุดที่ประเมิน

### รันทั้งสองแบบและเลือก

```python
p01_results = pd.DataFrame([
    validation_scores('Simple', features_simple),
    validation_scores('Multiple', features_multiple),
]).set_index('model')
display(p01_results.round(3))
selected_p01 = p01_results['RMSE_kWh'].idxmin()
```

- `[รายการ, รายการ]` รวบรวมผลจากสองการเรียกฟังก์ชัน
- `pd.DataFrame(...)` แปลงรายการ dictionary เป็นตาราง
- `.set_index('model')` ใช้ชื่อโมเดลเป็นป้ายแถว
- `.round(3)` ปัดตัวเลขที่แสดงให้เหลือ 3 ตำแหน่ง (ไม่ใช่เปลี่ยนความเที่ยงตรงของการคำนวณต้นทาง)
- `p01_results['RMSE_kWh']` เลือกคอลัมน์ RMSE
- `.idxmin()` คืน label ของแถวที่มีค่าน้อยที่สุด

จึงเลือกด้วย **validation RMSE ต่ำสุด** ตามโจทย์ แล้วอ่าน MAE และ R² ประกอบเพื่อเข้าใจความคลาดเคลื่อนและความสามารถในการอธิบายข้อมูล

## 4. P02 — การทดลอง Bias–Variance

### แนวคิด

สร้างข้อมูลสังเคราะห์จาก `x` ที่สุ่มสม่ำเสมอระหว่าง 0 ถึง 6 และ `y = sin(x) + noise` โดย noise เป็นการสุ่มแบบปกติที่มีส่วนเบี่ยงเบนมาตรฐาน 0.25

- **Bias สูง / underfit**: โมเดลง่ายเกินไป จับรูปแบบจริงไม่ครบ มักผิดทั้ง train และ validation
- **Variance สูง / overfit**: โมเดลยืดหยุ่นมาก เรียนรู้รายละเอียดเฉพาะของ train จนดีบน train แต่แย่หรือเปลี่ยนมากบน validation
- degree 1 เป็นเส้นตรง, degree 3 มีความโค้งมากขึ้น, degree 12 ยืดหยุ่นสูง

### สร้างข้อมูลแบบทำซ้ำได้

```python
def sine_data(seed, n):
    rng = np.random.default_rng(seed)
    x = rng.uniform(0, 6, size=(n, 1))
    y = np.sin(x[:, 0]) + rng.normal(0, 0.25, n)
    return x, y
```

- `np.random.default_rng(seed)` สร้าง random number generator (RNG); seed เดิมให้ลำดับสุ่มเดิม ทำให้ทำซ้ำได้
- `.uniform(0, 6, size=(n, 1))` สุ่ม n ค่าในช่วง [0, 6) และจัดเป็นตาราง n แถว 1 คอลัมน์ ซึ่งเป็นรูปแบบ X ที่ scikit-learn คาดหวัง
- `x[:, 0]` หมายถึงทุกแถว (`:`) ของคอลัมน์แรก (`0`) ทำให้ได้เวกเตอร์หนึ่งมิติสำหรับคำนวณ `sin`
- `.normal(0, 0.25, n)` สุ่ม noise n ค่า จากการแจกแจงปกติ ค่าเฉลี่ย 0 และส่วนเบี่ยงเบนมาตรฐาน 0.25
- `return x, y` ส่งค่ากลับสองรายการ

### วนทุก seed และ degree

```python
x_val, y_val = sine_data(2026, 200)
seeds, degrees = [11, 22, 33], [1, 3, 12]
```

Validation สร้างครั้งเดียวด้วย seed 2026 เพื่อให้โมเดลทั้งหมดเปรียบเทียบกับ validation ชุดเดียวกัน ส่วน train สร้างใหม่ตาม seed 11, 22, 33 มี 3 ชุดฝึก × 3 degree = 9 การทดลอง

ลูปซ้อน:

```python
for seed in seeds:
    x_train, y_train = sine_data(seed, 35)
    for degree in degrees:
        ...
```

ลูปนอกเปลี่ยนชุดฝึก; ลูปในทดลอง degree ทุกค่ากับชุดฝึกนั้น `range` ไม่ได้ใช้ที่นี่ เพราะต้องวนสมาชิกใน list โดยตรง

```python
model = make_pipeline(
    PolynomialFeatures(degree=degree, include_bias=False),
    StandardScaler(),
    LinearRegression(),
)
```

pipeline รันขั้นตอนตามลำดับ:

1. `PolynomialFeatures` ขยาย x เป็น feature กำลังต่าง ๆ เช่น degree 3 สร้าง x, x², x³
2. `include_bias=False` ไม่สร้างคอลัมน์ค่าคงที่ 1 เพราะ LinearRegression มี intercept ให้โดยปริยาย
3. `StandardScaler` ปรับสเกล feature; เมื่ออยู่ใน pipeline จะ fit scaler จาก train และนำค่าที่ fit แล้วไปใช้กับ validation ป้องกันข้อมูล validation รั่วเข้าไปในขั้น fit
4. `LinearRegression` fit บน feature ที่แปลงแล้ว

```python
model.fit(x_train, y_train)
train_pred = model.predict(x_train)
val_pred = model.predict(x_val)
pred_at_2 = model.predict(np.array([[2.0]]))[0]
```

`fit` เรียนรู้จาก train; `predict` สร้างค่าทำนายสำหรับ train และ validation; `np.array([[2.0]])` สร้างอาร์เรย์สองมิติ 1 แถว 1 คอลัมน์ตามรูปแบบ input ที่โมเดลต้องการ; `[0]` หยิบผลทำนายรายการแรก

RMSE คำนวณแบบเดียวกับ P01 ใช้ดู error บน train และ validation แยกกัน การเก็บ `prediction_at_x2` ช่วยดูว่าโมเดลต่าง ๆ ให้ค่าที่ x=2 ใกล้กันเพียงใดเมื่อเปลี่ยนชุดฝึก

### เก็บผลและสรุป

```python
records = []
records.append({'seed': seed, 'degree': degree, ...})
p02_results = pd.DataFrame(records).sort_values(['degree', 'seed']).reset_index(drop=True)
```

- `[]` เริ่ม list ว่าง
- `.append(...)` เพิ่ม dictionary หนึ่งแถวในแต่ละรอบ
- `.sort_values([...])` เรียงตาม degree แล้วตาม seed
- `.reset_index(drop=True)` สร้างเลข index ใหม่และไม่เก็บ index เก่าเป็นคอลัมน์

```python
summary_p02 = p02_results.groupby('degree')[...].agg(['mean', 'std']).round(4)
```

`groupby('degree')` แบ่งแถวตาม degree; `.agg(['mean', 'std'])` คำนวณค่าเฉลี่ยและส่วนเบี่ยงเบนมาตรฐานในแต่ละกลุ่ม ค่า std ที่มากขึ้นบ่งชี้ผลจาก seed ทั้งสามต่างกันมากขึ้น แต่มีเพียง 3 รอบ จึงเป็นหลักฐานจำกัด ไม่ควรสรุปเป็นกฎทั่วไปจากตัวอย่างนี้อย่างเดียว

## 5. P03 — Residual และการปรับปรุงโมเดล

### Residual คืออะไร

`residual = ค่าจริง − ค่าทำนาย` หาก residual บวก โมเดลทำนายต่ำไป; หากลบ โมเดลทำนายสูงไป จุดที่กระจายสุ่มรอบศูนย์มักเป็นสัญญาณที่เหมาะสมกว่าแนวโค้งหรือแนวโน้มชัดเจน อย่างไรก็ตาม validation มีเพียง 18 วัน กราฟจึงเป็นเครื่องมือตรวจเบื้องต้น ไม่ใช่หลักฐานแน่ชัด

```python
multiple_model = LinearRegression().fit(train[features_multiple], train['energy_kwh'])
multiple_fitted = multiple_model.predict(validation[features_multiple])
residual_check = validation[['date', 'energy_kwh']].copy()
residual_check['fitted_kwh'] = multiple_fitted
residual_check['residual_kwh'] = residual_check['energy_kwh'] - residual_check['fitted_kwh']
```

คำสั่งต่อจุด (`.fit(...)`) สร้างและฝึกโมเดลใน expression เดียว; `validation[['date', 'energy_kwh']]` เลือกสองคอลัมน์; การเขียน `ตาราง['ชื่อใหม่'] = ค่า` เพิ่มคอลัมน์ fitted และ residual

### วาดกราฟสองมุมมอง

```python
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
```

สร้างพื้นที่รูป (`fig`) และแกนกราฟสองช่อง (`axes`) จัด 1 แถว 2 คอลัมน์ ขนาด 12 × 4 นิ้ว

- `axes[0].scatter(...)` วาดจุด residual เทียบ fitted เพื่อมองหารูปแบบที่เหลืออยู่
- `axes[1].plot(..., marker='o')` วาด residual ตามวันที่พร้อม marker วงกลม เพื่อตรวจการเปลี่ยนแปลงตามเวลา
- `.axhline(0, ...)` วาดเส้นอ้างอิงที่ residual = 0
- `.set(...)` กำหนดชื่อแกนและชื่อกราฟ
- `.tick_params(axis='x', rotation=45)` หมุนป้ายวันที่เพื่อให้อ่านง่าย
- `fig.tight_layout()` จัดระยะห่างอัตโนมัติ
- `plt.show()` แสดงกราฟ
- `display(residual_check.round(3))` แสดงตารางค่าจริง ค่าทำนาย และ residual ประกอบ

### Feature engineering และแบบจำลอง A–D

Feature engineering คือการสร้างตัวแปรใหม่จากตัวแปรเดิมเพื่อให้โมเดลแทนรูปแบบที่ซับซ้อนขึ้นได้

```python
def make_features(frame):
    result = frame.copy()
    result['temp_squared'] = result['temp_forecast_c'] ** 2
    return result
```

`** 2` ยกกำลังสอง; สร้างสำเนาก่อนเพิ่มคอลัมน์เพื่อไม่เปลี่ยนตารางเดิม

| แบบ | Features | โมเดล | จุดเปรียบเทียบ |
|---|---|---|---|
| A | อุณหภูมิ, วันทำการ | LinearRegression | เส้นตรงสอง feature |
| B | A และอุณหภูมิ² | LinearRegression | เพิ่มความโค้งแบบกำลังสอง |
| C | features ของ B | StandardScaler → Ridge(alpha=0.1) | regularization อ่อนกว่า |
| D | features ของ B | StandardScaler → Ridge(alpha=10) | regularization เข้มกว่า |

Ridge เพิ่มโทษตามขนาด coefficient เพื่อลด coefficient ที่ใหญ่เกินไป `alpha` ควบคุมความแรง: ค่าสูงโดยทั่วไปหด coefficient มากขึ้น การ scale ก่อน Ridge สำคัญเพราะการลงโทษ coefficient มีผลตามสเกลของ feature

พจนานุกรม `models` เก็บคู่ `(โมเดล, รายชื่อ feature)` ไว้ภายใต้ label A/B/C/D; tuple ใช้วงเล็บ `(...)` และ unpack ได้ด้วย `for label, (model, features) in models.items()`

ในลูปแต่ละแบบจะ fit ด้วย train ที่สร้าง feature แล้ว จากนั้นทำนาย validation และเก็บ RMSE, MAE, รายชื่อ feature และ alpha ลงใน `rows` ก่อนสร้าง DataFrame และเรียง RMSE จากน้อยไปมาก

### กฎเลือกโมเดล

```python
best_rmse = p03_results['validation_RMSE_kWh'].min()
within_tolerance = p03_results[p03_results['validation_RMSE_kWh'] < best_rmse + 0.01].copy()
```

`.min()` หาค่า RMSE ต่ำสุด; เงื่อนไขในวงเล็บเหลี่ยมเป็น boolean filter เลือกโมเดลที่ RMSE ต่างจากค่าต่ำสุดน้อยกว่า 0.01 kWh

```python
complexity = {'A': 0, 'B': 1, 'C': 2, 'D': 2}
within_tolerance['complexity'] = within_tolerance['model'].map(complexity)
within_tolerance['alpha_rank'] = within_tolerance['model'].map({'C': 0.1, 'D': 10}).fillna(-1)
chosen_label = within_tolerance.sort_values(['complexity', 'alpha_rank']).iloc[0]['model']
```

`.map(dictionary)` แปลง label เป็นค่าความซับซ้อนหรือ alpha; `.fillna(-1)` กำหนดค่าให้แถวที่ไม่มี alpha (A/B); `.sort_values(...)` เลือกโครงสร้างซับซ้อนน้อยก่อน และเมื่อ C/D เสมอกันเลือก alpha ต่ำ; `.iloc[0]` หยิบแถวแรกหลังเรียง

### ประเมิน final test หลังการเลือก

```python
final_test = pd.read_csv('regression_final_test.csv', parse_dates=['date'])
development_fe, final_test_fe = make_features(development), make_features(final_test)
chosen_model, chosen_features = models[chosen_label]
chosen_model.fit(development_fe[chosen_features], development_fe['energy_kwh'])
final_pred = chosen_model.predict(final_test_fe[chosen_features])
```

เมื่อเลือก `chosen_label` จาก validation แล้ว จึงโหลด final test และฝึกโมเดลที่เลือกใหม่บน development ครบ 90 แถว การ fit ซ้ำนี้ให้โมเดลใช้ข้อมูลพัฒนาเพิ่มทั้ง train และ validation จากนั้นทำนาย final test เพียงครั้งเดียวและคำนวณ MAE, RMSE, R²

ผล final test ใช้เป็นค่าประเมินสุดท้าย ไม่ควรกลับไปเปลี่ยนโมเดลเพราะเห็นคะแนน test หากจะปรับโมเดลต่อ ต้องมีชุดทดสอบชุดใหม่สำหรับการประเมินที่เป็นอิสระ

## 6. P04 — Bootstrap ของ coefficient

P04 ใช้ model A จาก development 90 แถว และเก็บ coefficient ของอุณหภูมิในแต่ละรอบ

```python
X_boot = development[features_A].to_numpy()
y_boot = development['energy_kwh'].to_numpy()
n = len(y_boot)
block_length = 7
n_boot = 300
```

- `.to_numpy()` แปลงคอลัมน์ pandas เป็น NumPy array
- `len(...)` คืนจำนวนรายการ (90)
- ตั้งบล็อกยาว 7 วัน และทำ bootstrap 300 ครั้งต่อวิธี

**Bootstrap** เป็นวิธีประเมินความแปรปรวนจากข้อมูลที่มี โดยสุ่มตัวอย่างซ้ำจากแถวเดิมแบบใส่คืน แล้ว fit โมเดลซ้ำหลายรอบ

```python
def bootstrap_temp_coeff(method, seed=20260922):
    rng = np.random.default_rng(seed)
    coefs = np.empty(n_boot)
    for b in range(n_boot):
        ...
    return coefs
```

พารามิเตอร์ `seed=20260922` เป็นค่าเริ่มต้น (default argument); `np.empty(n_boot)` จอง array สำหรับเก็บ coefficient; `range(n_boot)` สร้างจำนวนเต็ม 0 ถึง 299 เพื่อวน 300 รอบ

### Ordinary pairs bootstrap

```python
idx = rng.integers(0, n, size=n)
```

สุ่มหมายเลขแถว n ครั้งจาก 0 ถึง n−1 โดยใส่คืน แถวเดิมจึงถูกเลือกซ้ำได้และบางแถวอาจไม่ถูกเลือก การจับคู่ X กับ y ยังคงถูกต้อง เพราะใช้ index เดียวกันเลือกทั้งสองชุด

### Moving-block pairs bootstrap

```python
starts = rng.integers(0, n - block_length + 1,
                      size=int(np.ceil(n / block_length)))
idx = np.concatenate([np.arange(s, s + block_length) for s in starts])[:n]
```

- `np.ceil(n / block_length)` ปัดจำนวนบล็อกขึ้น เพื่อให้มีข้อมูลรวมอย่างน้อย n แถว
- `int(...)` แปลงผลจากตัวเลขทศนิยมเป็นจำนวนเต็ม
- `np.arange(s, s + block_length)` สร้าง index ต่อเนื่องยาว 7 แถว โดยค่า stop ไม่รวม
- list comprehension `[... for s in starts]` สร้างบล็อกหนึ่งชุดต่อ start แต่ละค่า
- `np.concatenate(...)` ต่อบล็อกให้เป็น array ยาว
- `[:n]` ตัดให้เหลือ n แถวพอดี

การสุ่มเป็นบล็อกช่วยรักษาความสัมพันธ์ระยะใกล้ตามลำดับเวลาในแต่ละบล็อก ต่างจาก ordinary pairs ที่สุ่มวันอิสระ อย่างไรก็ดี วิธีนี้ยังตั้งสมมติฐานว่าบล็อกที่สุ่มมาเป็นตัวแทนที่ใช้ได้ และข้อมูล 90 วันอาจสั้นเกินไปสำหรับรูปแบบเวลาระยะยาว

### Fit ซ้ำและสร้างช่วง percentile

```python
model = LinearRegression().fit(X_boot[idx], y_boot[idx])
coefs[b] = model.coef_[0]
```

fit โมเดลกับแถวที่สุ่มได้ แล้วเก็บ coefficient ตัวแรก ซึ่งตรงกับ feature ตัวแรกใน `features_A` คืออุณหภูมิ ส่วน `working_day` เป็นตัวที่สอง

```python
lo, hi = np.percentile(coefs, [2.5, 97.5])
```

`.percentile` หาค่าที่เปอร์เซ็นไทล์ 2.5 และ 97.5 ของ coefficient 300 ค่า แล้ว unpack ใส่ตัวแปร `lo` และ `hi` ใช้สรุปช่วง percentile กลางประมาณ 95% ภายใต้กระบวนการ bootstrap ที่กำหนด

Coefficient อุณหภูมิอ่านเป็นความสัมพันธ์ที่โมเดลประมาณว่า เมื่ออุณหภูมิพยากรณ์เพิ่ม 1°C และ `working_day` คงเดิม พลังงานที่โมเดลทำนายเปลี่ยนกี่ kWh โดยไม่ใช่ข้อพิสูจน์ว่าอุณหภูมิเป็นสาเหตุ

ช่วงนี้สะท้อนความไม่แน่นอนของ **coefficient** ภายใต้การสุ่ม bootstrap ไม่ใช่ **prediction interval** ของพลังงานในวันใหม่ Prediction interval ต้องรวมทั้งความไม่แน่นอนของโมเดลและความผันผวนของค่ารายวันรอบค่าทำนายด้วย จำนวน 300 รอบและข้อมูลเพียง 90 วันยังทำให้ขอบเขตขึ้นกับข้อมูลและสมมติฐานอย่างมาก

### ทำไมเรียก confidence interval ด้วยความระมัดระวัง

การเรียกช่วง percentile จาก bootstrap ว่า confidence interval เป็นคำอธิบายอย่างย่อ แต่การครอบคลุมระดับ 95% จริงขึ้นกับสมมติฐานการสุ่ม ความเป็นตัวแทนของข้อมูล ความขึ้นต่อกันตามเวลา และจำนวนแถว Ordinary bootstrap ถือว่าแถวอิสระเป็นหลัก ส่วน moving-block พยายามรักษาความสัมพันธ์ระยะสั้น ไม่ได้แก้ทุกปัญหา dependence ดังนั้นควรรายงานวิธีที่ใช้และตีความช่วงเป็นค่าประมาณจากข้อมูลนี้

## 7. Syntax ที่พบซ้ำในโน้ตบุ๊ก

- `# ข้อความ` คือ comment; Python ไม่ประมวลผล ใช้จดบันทึกหรือแบ่งส่วน
- `=` กำหนดค่าให้ตัวแปร; `==` ใช้เปรียบเทียบว่าเท่ากันหรือไม่
- `:` หลัง `def`, `for`, `if` เปิดบล็อกคำสั่ง และใช้ในการเลือก slice เช่น `[:72]`
- การเยื้อง (indentation) กำหนดว่าคำสั่งใดอยู่ภายใน function/loop
- `()` ใช้เรียกฟังก์ชันหรือสร้าง tuple; `[]` ใช้สร้าง list เลือกคอลัมน์ และ slice; `{}` ใช้สร้าง dictionary หรือ set ตามบริบท
- `.` เรียก method/attribute ของ object เช่น `model.fit`, `df.head`, `np.__version__`
- `f'...{ตัวแปร}...'` คือ f-string แทรกค่าตัวแปรลงในข้อความ
- `:.3f` ใน f-string กำหนดรูปแบบทศนิยม 3 ตำแหน่ง
- `**` คือยกกำลัง; `/` คือหาร; `+` บวก; `-` ลบ
- `and` ต้องเป็นจริงทั้งสองเงื่อนไข; `in` ตรวจการเป็นสมาชิก เช่น `label in ...`
- `_` ในชื่อเช่น `temp_forecast_c` ใช้คั่นคำให้อ่านง่าย ไม่มีผลพิเศษต่อ Python

## 8. ลำดับที่แนะนำเมื่อรัน

1. วาง `regression_development.csv` และ `regression_final_test.csv` ไว้ตำแหน่งที่ notebook อ่านเจอ (โดยปกติคือโฟลเดอร์เดียวกัน)
2. รันเซลล์จากบนลงล่าง เพื่อให้ตัวแปรและฟังก์ชันถูกสร้างก่อนถูกเรียกใช้
3. ตรวจ P01 และ P02 บน train/validation ก่อน
4. ใน P03 ใช้ validation เลือกโมเดล แล้วจึงประเมิน final test หลัง fit ใหม่ด้วย development 90 แถว
5. รัน P04 เป็นการวิเคราะห์เสริม coefficient ไม่ใช่การเลือกโมเดลจาก final test
6. บันทึกตาราง/กราฟและเขียนสรุปด้วยภาษาของตนเอง: โมเดลทำได้เท่าใด หลักฐานคืออะไร และข้อสรุปใดเกินกว่าข้อมูล

## 9. สิ่งที่ผลการทดลองนี้บอกและไม่บอก

คะแนนบอกความแม่นบนชุดข้อมูลจำลองและช่วงข้อมูลที่ใช้วัด ภายใต้ feature และวิธีแบ่งข้อมูลนี้ ผลไม่ได้ยืนยันว่าโมเดลจะทำงานเท่ากันกับข้อมูลจริง ช่วงฤดูกาลอื่น หรืออาคารอื่น และไม่แสดงเหตุและผล การตีความที่รับผิดชอบควรรายงานตัวเลขพร้อมชุดที่วัด วิธีเลือกโมเดล และข้อจำกัดของข้อมูล/สมมติฐาน
