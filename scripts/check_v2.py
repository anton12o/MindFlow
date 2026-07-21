import sqlite3, json
conn = sqlite3.connect(r'C:\Users\AntonioF\Downloads\AppMindFLow\backend\mindflow.db')
for id_ in [16, 17]:
    row = conn.execute('SELECT id, titulo, propriedades FROM tarefas WHERE id = ?', (id_,)).fetchone()
    if row:
        print(f'id={id_}, titulo={row[1]}')
        props = row[2] or '{}'
        p = json.loads(props)
        rice = p.get('matriz_rice', {})
        v = rice.get('_v', 'AUSENTE')
        reach = rice.get('reach')
        impacto = rice.get('impacto')
        confidence = rice.get('confidence')
        effort = rice.get('effort')
        print(f'  RICE: _v={v}, reach={reach}, impacto={impacto}, confidence={confidence}, effort={effort}')
    else:
        print(f'id={id_} nao encontrado')
conn.close()
