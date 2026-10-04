---
course: "[[Data Science]]"
code: CP352101
type: lab
chapters: "8"
related:
  - "[[เฉลยแบบทดสอบ Ch7-8]]"
tags:
  - data-science
  - CP352101
  - lab
---

# คู่มืออธิบาย `starter_gaussian_lab.ipynb`

เอกสารนี้สรุปแนวคิดและอธิบายโค้ดของ Notebook งาน P05 เรื่อง Gaussian basis และ regularization รวมถึงผลที่ปรากฏใน Notebook ฉบับที่ตรวจอ่าน

## ภาพรวมของงาน

Notebook ใช้ข้อมูลจำลองจากสมการ

$$
y = \sin(x) + \epsilon, \qquad x \sim Uniform(0,10), \qquad \epsilon \sim Normal(0, 0.15)
$$

เป้าหมายคือแปลง `x` ให้เป็น features หลายคอลัมน์ แล้วเปรียบเทียบโมเดลสามแบบบนข้อมูลและ features ชุดเดียวกัน:

- **OLS**: Linear Regression ที่ไม่มี penalty
- **Ridge**: Linear Regression ที่เพิ่ม L2 penalty
- **Lasso**: Linear Regression ที่เพิ่ม L1 penalty

ลำดับงานคือสร้าง train/validation → สร้าง Gaussian features และปรับสเกลโดย fit จาก train เท่านั้น → เลือกโมเดลด้วย validation RMSE → ประเมิน final test หนึ่งครั้ง

## ชุดข้อมูลตาม protocol

| ชุด | จำนวนแถว | seed | หน้าที่ |
|---|---:|---:|---|
| Train | 50 | 41 | Fit basis, scaler และโมเดล |
| Validation | 100 | 42 | เปรียบเทียบและเลือกโมเดล |
| Final test | 100 | 43 | ประเมินโมเดลที่เลือกหลังตัดสินใจแล้ว |

seed ทำให้สร้างข้อมูลสุ่มชุดเดิมซ้ำได้เมื่อใช้โค้ดเดิม แต่ไม่ได้ลบ noise หรือรับประกันว่าชุดต่าง ๆ จะมีการกระจายเหมือนกัน

## อธิบายโค้ดตามลำดับ

### 1. Import ไลบรารีและฟังก์ชันวัด RMSE

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.metrics import mean_squared_error

def rmse(y, prediction):
    return np.sqrt(mean_squared_error(y, prediction))
```

- `import ... as ...` นำไลบรารีเข้ามาและตั้งชื่อย่อ เช่น NumPy เป็น `np` และ pandas เป็น `pd`
- `matplotlib.pyplot` ใช้สร้างกราฟ ส่วน `LinearRegression`, `Ridge`, `Lasso` คือโมเดลที่จะเปรียบเทียบ
- `PolynomialFeatures` สร้างกำลังของตัวแปร เช่น `x`, `x²`, `x³`; `StandardScaler` ปรับสเกล features
- `mean_squared_error` คำนวณค่าเฉลี่ยกำลังสองของความคลาดเคลื่อน
- `def rmse(...)` ประกาศฟังก์ชันที่รับค่าจริง `y` และค่าพยากรณ์ `prediction` แล้วคืน `sqrt(MSE)` ค่า RMSE มีหน่วยเดียวกับเป้าหมาย

### 2. สร้างข้อมูลจำลอง

```python
def make_sine_data(seed, n):
    rng = np.random.default_rng(seed)
    x = rng.uniform(0, 10, size=(n, 1))
    y = np.sin(x[:, 0]) + rng.normal(0, 0.15, size=n)
    return x, y
```

- `def` ประกาศฟังก์ชัน รับ seed และจำนวนตัวอย่าง `n`
- `np.random.default_rng(seed)` สร้าง random generator สำหรับชุดนั้นโดยเฉพาะ
- `rng.uniform(0, 10, size=(n, 1))` สุ่ม `x` ระหว่าง 0–10 เป็นเมทริกซ์ `n` แถว 1 คอลัมน์
- `x[:, 0]` เลือกคอลัมน์แรกเป็นเวกเตอร์ก่อนคำนวณ sine
- `rng.normal(0, 0.15, size=n)` สร้าง noise แบบปกติ ค่าเฉลี่ย 0 และส่วนเบี่ยงเบนมาตรฐาน 0.15
- `return x, y` คืน input และ target สองค่า ซึ่งเรียกใช้ได้ด้วย `x_train, y_train = ...`

### 3. คลาส GaussianFeatures

คลาสนี้ทำให้การแปลงข้อมูลใช้รูปแบบ scikit-learn: `.fit(...)` เรียนค่าจาก train และ `.transform(...)` แปลงข้อมูล คลาสสืบทอด `TransformerMixin` และ `BaseEstimator` เพื่อเข้ากับ API ของ scikit-learn

```python
class GaussianFeatures(TransformerMixin, BaseEstimator):
    def __init__(self, N=12, width_factor=0.8):
        self.N = N
        self.width_factor = width_factor
```

`__init__` รับจำนวน basis `N` และตัวคูณความกว้าง `width_factor`; `self.attribute = value` เก็บค่าลงในออบเจ็กต์

เมธอด `fit` ตรวจ input และเรียน centers กับ sigma:

```python
def fit(self, X, y=None):
    X = check_array(X, ensure_2d=True)
    if X.shape[1] != 1:
        raise ValueError('P05 protocol accepts one input feature only.')
    if not isinstance(self.N, (int, np.integer)) or self.N < 2:
        raise ValueError('N must be an integer >= 2.')
    if not np.isfinite(self.width_factor) or self.width_factor <= 0:
        raise ValueError('width_factor must be positive and finite.')
    if X.max() <= X.min():
        raise ValueError('Training x must have a positive range.')
    self.n_features_in_ = 1
    self.centers_ = np.linspace(X.min(), X.max(), self.N)
    self.sigma_ = self.width_factor * (self.centers_[1] - self.centers_[0])
    return self
```

- `check_array(..., ensure_2d=True)` ตรวจ/จัดรูปข้อมูลให้เป็น array สองมิติ
- `X.shape[1]` คือจำนวนคอลัมน์ จึงตรวจว่ามี input feature เดียวตามโจทย์
- `isinstance` ตรวจชนิดของ `N`; `np.isfinite` ตรวจว่า `width_factor` ไม่ใช่ NaN หรืออนันต์
- `if ...:` ทำงานเมื่อเงื่อนไขเป็นจริง; `raise ValueError(...)` หยุดพร้อมแจ้งปัญหา
- `np.linspace(min, max, N)` วาง centers `N` จุดสม่ำเสมอระหว่างค่าน้อยสุดและมากสุดของ train
- `sigma_ = width_factor × ระยะห่าง centers`; `_` ท้ายชื่อเป็นธรรมเนียมของ scikit-learn สำหรับค่าที่เรียนจาก fit
- `return self` คืนออบเจ็กต์เดิม

เมธอด `transform` ใช้ centers/sigma ที่ fit ไว้คำนวณ Gaussian features:

```python
def transform(self, X):
    check_is_fitted(self, ['centers_', 'sigma_'])
    X = check_array(X, ensure_2d=True)
    if X.shape[1] != 1:
        raise ValueError('P05 protocol accepts one input feature only.')
    return np.exp(-0.5 * ((X[:, 0, None] - self.centers_[None, :]) / self.sigma_) ** 2)
```

สูตรคือ $\phi_j(x)=\exp[-\frac12((x-c_j)/\sigma)^2]$ แต่ละ feature มีค่าสูงเมื่อ `x` ใกล้ center `c_j` และลดลงเมื่ออยู่ห่าง

- `check_is_fitted` ป้องกันการเรียก transform ก่อน fit
- `X[:, 0, None]` มี shape `(แถว, 1)` และ `centers_[None, :]` มี shape `(1, N)`
- NumPy broadcasting เปรียบเทียบทุกแถวกับทุก center โดยอัตโนมัติ ผลจึงมี shape `(จำนวนตัวอย่าง, N)`
- `** 2` คือยกกำลังสอง และ `np.exp` คำนวณ exponential

### 4. ข้อ 1: สร้าง train/validation และ Polynomial features

```python
x_train, y_train = make_sine_data(seed=41, n=50)
x_val, y_val = make_sine_data(seed=42, n=100)

poly = PolynomialFeatures(degree=3, include_bias=False)
X_poly_train = poly.fit_transform(x_train)
print("Polynomial feature names:", poly.get_feature_names_out(["x"]))
display(pd.DataFrame(X_poly_train[:3], columns=poly.get_feature_names_out(["x"])))
```

- สร้าง train 50 แถวและ validation 100 แถวด้วย seed แยกกัน
- `PolynomialFeatures(degree=3, include_bias=False)` สร้างคอลัมน์ `x`, `x²`, `x³` โดยไม่เพิ่มคอลัมน์ค่าคงที่ 1 เพราะโมเดล fit intercept เอง
- `.fit_transform(x_train)` เรียนรูปแบบคอลัมน์จาก train แล้วแปลง train
- `[:3]` เลือกสามแถวแรก; `DataFrame` และ `display` แสดงผลเป็นตาราง

ผลใน Notebook:

| แถว | x | x² | x³ |
|---:|---:|---:|---:|
| 0 | 9.541511 | 91.040433 | 868.663293 |
| 1 | 7.679321 | 58.971970 | 452.864679 |
| 2 | 1.259707 | 1.586863 | 1.998983 |

Polynomial matrix นี้ใช้สาธิตการสร้าง features; โมเดลข้อ 3 ใช้ Gaussian features แทน

### 5. ข้อ 2: Fit Gaussian basis และ scaler

```python
gaussian = GaussianFeatures(N=12, width_factor=0.8)
G_train = gaussian.fit_transform(x_train)
G_val = gaussian.transform(x_val)

scaler = StandardScaler()
G_train_scaled = scaler.fit_transform(G_train)
G_val_scaled = scaler.transform(G_val)
```

- `fit_transform(x_train)` เรียน centers/sigma จาก train และแปลง train
- `transform(x_val)` แปลง validation ด้วย basis เดิม ไม่ fit ใหม่
- `scaler.fit_transform(G_train)` เรียนค่าเฉลี่ย/ส่วนเบี่ยงเบนมาตรฐานจาก train แล้วปรับสเกล train
- `scaler.transform(G_val)` ใช้ค่าที่เรียนจาก train ปรับสเกล validation วิธีนี้ป้องกัน data leakage

ผลที่แสดง: centers 12 จุดตั้งแต่ประมาณ `0.5848` ถึง `9.9429`, `sigma ≈ 0.68059`, `G_train.shape = (50, 12)` และ `G_val.shape = (100, 12)`

```python
x_grid = np.linspace(x_train.min(), x_train.max(), 300).reshape(-1, 1)
basis_grid = gaussian.transform(x_grid)
plt.figure(figsize=(10, 5))
for j in range(basis_grid.shape[1]):
    plt.plot(x_grid[:, 0], basis_grid[:, j], alpha=0.75)
plt.xlabel("x")
plt.ylabel("Gaussian feature value")
plt.title("Gaussian basis fitted on training data")
plt.grid(alpha=0.25)
plt.show()
```

`linspace` สร้างจุด 300 จุดสำหรับกราฟ; `reshape(-1, 1)` ทำให้เป็นเมทริกซ์หนึ่งคอลัมน์; loop วาด basis แต่ละคอลัมน์ ค่า `alpha` กำหนดความโปร่งใส และ `show()` แสดงกราฟ

### 6. ข้อ 3: Fit และเปรียบเทียบโมเดล

```python
models = {
    'OLS': LinearRegression(),
    'Ridge': Ridge(alpha=0.1),
    'Lasso': Lasso(alpha=0.001, max_iter=100000, tol=1e-6),
}
```

`models` เป็น dictionary ที่ผูกชื่อกับโมเดล ค่า `alpha` กำหนด penalty; `max_iter` คือจำนวนรอบสูงสุด และ `tol` เป็น tolerance สำหรับหยุดการหาคำตอบของ Lasso

```python
results = []
for name, model in models.items():
    model.fit(G_train_scaled, y_train)
    train_pred = model.predict(G_train_scaled)
    val_pred = model.predict(G_val_scaled)
    results.append({
        'Model': name,
        'Train RMSE': rmse(y_train, train_pred),
        'Validation RMSE': rmse(y_val, val_pred),
    })
results = pd.DataFrame(results)
display(results)
```

- `results = []` สร้าง list ว่าง; `.items()` วนอ่าน key/value ของ dictionary
- `.fit(X, y)` fit โมเดลด้วย train; `.predict(X)` สร้างค่าพยากรณ์
- `.append({...})` เพิ่มผลของแต่ละโมเดล; จากนั้นแปลงเป็น DataFrame เพื่อแสดงเป็นตาราง

ผลใน Notebook:

| Model | Train RMSE | Validation RMSE |
|---|---:|---:|
| OLS | 0.124040 | 0.177482 |
| Ridge | 0.124603 | 0.180730 |
| Lasso | 0.124585 | 0.177780 |

เลือกโมเดลโดย validation และกติกาเสมอ:

```python
tie_order = {'OLS': 0, 'Ridge': 1, 'Lasso': 2}
best_val_rmse = results['Validation RMSE'].min()
eligible = results[results['Validation RMSE'] <= best_val_rmse + 1e-6]
selected_name = min(eligible['Model'], key=tie_order.get)
selected_model = models[selected_name]
```

`.min()` หาค่า RMSE ต่ำสุด; เงื่อนไข `<= best + 1e-6` ถือว่าค่าที่ต่างกันไม่เกิน `1e-6` เสมอกัน; `tie_order` ให้ OLS มาก่อน Ridge และ Lasso; `selected_model` อ้างถึงโมเดลที่ fit แล้ว จากตาราง OLS มี Validation RMSE ต่ำสุด `0.177482` และถูกเลือก

### 7. Final test

```python
x_test, y_test = make_sine_data(seed=43, n=100)
G_test = gaussian.transform(x_test)
G_test_scaled = scaler.transform(G_test)
test_pred = selected_model.predict(G_test_scaled)
test_rmse = rmse(y_test, test_pred)
print(f'Final-test RMSE ({selected_name}): {test_rmse:.6f}')
```

สร้าง final test หลังเลือกโมเดลแล้ว ใช้ basis และ scaler ที่ fit จาก train เดิม transform test จากนั้นพยากรณ์และคำนวณ RMSE โดยไม่ fit โมเดลซ้ำ `f'...'` คือ f-string สำหรับแทรกค่า; `:.6f` แสดงทศนิยม 6 ตำแหน่ง ผลที่บันทึกไว้คือ OLS และ Final-test RMSE `0.177221`

## คำตอบข้อ 4: อธิบายผลด้วยหลักฐาน

จากตาราง OLS มี Train RMSE `0.124040` และ Validation RMSE `0.177482` ซึ่งต่ำที่สุดในสามโมเดล Ridge มี Train RMSE `0.124603` และ Validation RMSE `0.180730`; Lasso มี Train RMSE `0.124585` และ Validation RMSE `0.177780` เมื่อเทียบกับ OLS ทั้ง Ridge และ Lasso มี Train RMSE สูงขึ้นเล็กน้อย และ Validation RMSE ก็สูงขึ้นเล็กน้อยในชุดทดลองนี้ จึงไม่มีหลักฐานจากตารางว่าการเพิ่ม penalty ช่วยลด validation error สำหรับค่าพารามิเตอร์ที่ใช้ แต่ไม่ได้หมายความว่า Ridge หรือ Lasso จะด้อยกว่าเสมอ

ค่า `alpha` ของ Ridge และ Lasso เปรียบเทียบความแรงของ penalty กันตรง ๆ ไม่ได้ เพราะ Ridge ใช้ L2 penalty กับกำลังสองของ coefficients ส่วน Lasso ใช้ L1 penalty กับค่าสัมบูรณ์ของ coefficients อีกทั้ง objective function ของทั้งสองวิธีมีรูปแบบการรวม loss กับ penalty ต่างกัน ([Ridge](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html), [Lasso](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Lasso.html))

ถ้าเปลี่ยนจำนวน Gaussian basis `N` พร้อมกับชนิด penalty จะเปลี่ยนทั้งจำนวน/รูปแบบ features และ regularization พร้อมกัน จึงแยกสาเหตุของคะแนนที่เปลี่ยนได้ยาก การทดลองนี้จึงตรึง basis, preprocessing และชุดข้อมูลไว้ แล้วเปรียบเทียบเฉพาะ OLS, Ridge และ Lasso

seed ช่วยให้สร้างข้อมูลชุดเดิมซ้ำได้ แต่ไม่ทำให้ noise หายหรือรับประกันว่าตัวอย่าง train, validation และ test จะมีการกระจายเหมือนกัน ผล Final-test RMSE `0.177221` เป็นหลักฐานจากข้อมูลจำลองตาม protocol นี้ ไม่ใช่การรับประกันผลบนข้อมูลจริงหรือข้อมูลชุดอื่น

## Syntax สำคัญ

| Syntax | ความหมาย |
|---|---|
| `def name(args):` | ประกาศฟังก์ชัน |
| `class Name(...):` | ประกาศคลาส |
| `self.attribute = value` | เก็บค่าลงในออบเจ็กต์ |
| `if condition:` | ทำงานเมื่อเงื่อนไขเป็นจริง |
| `raise ValueError(...)` | หยุดพร้อมแจ้งข้อผิดพลาด |
| `for item in iterable:` | วนทำงานกับสมาชิกแต่ละตัว |
| `X[:, 0]` | เลือกทุกแถวจากคอลัมน์แรก |
| `X[:3]` | เลือกสามแถวแรก |
| `array.shape` | อ่านจำนวนแถวและคอลัมน์ |
| `** 2` | ยกกำลังสอง |
| `dict.items()` | วนคู่ key/value ใน dictionary |
| `list.append(value)` | เพิ่มค่าเข้า list |
| `f'{value:.6f}'` | แทรกค่าและแสดงทศนิยม 6 ตำแหน่ง |
| `fit` / `transform` / `fit_transform` | เรียนค่าจากข้อมูล / แปลงข้อมูล / เรียนแล้วแปลงต่อเนื่อง |

## ข้อควรจำ

1. ใช้ train, validation และ test ตามบทบาทของแต่ละชุด
2. Fit centers, sigma และ StandardScaler จาก train เท่านั้น
3. ใช้ validation เลือกโมเดล แล้วใช้ final test หลังตัดสินใจเพียงครั้งเดียว
4. เปรียบเทียบโมเดลด้วย features และ preprocessing เดียวกัน
5. ตีความคะแนนพร้อมข้อจำกัดของข้อมูลและการทดลอง
