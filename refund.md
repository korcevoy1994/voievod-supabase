# Возврат платежа

Возврат может быть частичным или полным и может быть осуществлен только один раз.

Если платеж был частично возвращен, а позже возникла необходимость вернуть оставшуюся часть суммы, вам придется обратиться в [службу поддержки](mailto:ecom@maib.md) **maib ecomm**.

| API endpoint (POST)                     |
| --------------------------------------- |
| https://api.maibmerchants.md/v1/refund  |

### **Параметры запроса (body)**

<table><thead><tr><th width="167">Параметр</th><th width="152">Обязательный</th><th width="166">Тип</th><th>Описание</th></tr></thead><tbody><tr><td>payId</td><td>ДА</td><td><br>string</td><td>Идентификатор транзакции для возврата</td></tr><tr><td>refundAmount</td><td>НЕТ</td><td><br>number(decimal)</td><td><p>Сумма, возвращаемая Покупателю в формате <strong>X.XX</strong></p><p>Например: <strong>10.25</strong> (currency=MDL) означает 10 лей и 25 бань.</p><p>Может быть меньше или равна сумме транзакции.</p><p>Если этот параметр не передан, будет возвращена полная сумма транзакции.</p></td></tr></tbody></table>

**Пример**

```json
{
"payId": "f16a9006-128a-46bc-8e2a-77a6ee99df75",
"refundAmount": 10.25
}
```

### **Параметры ответа**

<table><thead><tr><th width="208.33333333333331">Параметр</th><th width="107">Тип</th><th>Описание</th></tr></thead><tbody><tr><td>result</td><td>Object</td><td>Объект содержащий данные транзакции</td></tr><tr><td><ul><li>payId</li></ul></td><td>String</td><td>Идентификатор транзакции от <strong>maib ecomm</strong> </td></tr><tr><td><ul><li>orderId</li></ul></td><td>String</td><td>Идентификатор заказа с сайта/приложения</td></tr><tr><td><ul><li>status</li></ul></td><td>String</td><td><p>Статус возврата.</p><p>OK - платеж успешно возвращен.</p></td></tr><tr><td><ul><li>statusCode</li></ul></td><td>String</td><td>Код статуса</td></tr><tr><td><ul><li>statusMessage</li></ul></td><td>String</td><td>Детали статуса транзакции</td></tr><tr><td><ul><li>refundAmount</li></ul></td><td>String</td><td>Сумма возвращенная Покупателю в формате <strong>X.XX</strong></td></tr><tr><td>ok</td><td>Boolean</td><td><p>Статус обработки запроса/транзакции:</p><p><em>true</em> - ошибок нет;</p><p><em>false -</em> есть ошибки (подробности ошибки будут отображаться в <em>errors</em>);</p></td></tr><tr><td>errors</td><td>Array</td><td>Ошибки обработки запроса/транзакций. <a href="oshibki/oshibki-api"><mark style="color:blue;">Таблица ошибок</mark></a></td></tr><tr><td><ul><li>errorCode</li></ul></td><td>String</td><td>Код ошибки</td></tr><tr><td><ul><li>errorMessage</li></ul></td><td>String</td><td>Описание ошибки</td></tr><tr><td><ul><li>errorArgs</li></ul></td><td>Object</td><td>Объект содержит параметры с информацией об ошибке</td></tr></tbody></table>

**Пример ответа**

{% tabs %}
{% tab title="Без ошибок" %}
```json
{
"result": {
"payId": "f16a9006-128a-46bc-8e2a-77a6ee99df75",
"orderId": "123",
"status": "OK",
"statusCode": "400",
"statusMessage": "Accepted",
"refundAmount": 10.25
},
"ok": true
}
```
{% endtab %}

{% tab title="С ошибками" %}
```json
{
    "errors": [
        {
            "errorCode": "12001",
            "errorMessage": "Parameter 'refundAmount' is invalid",
            "errorArgs": {
                "parameter": "refundAmount"
            }
        }
    ],
    "ok": false
}
```
{% endtab %}
{% endtabs %}

