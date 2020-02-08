SELECT SCHEMA_NAME(type_t.schema_id) + '.' + type_t.name      AS type_name,
	   SCHEMA_NAME(type_t.schema_id) as schema_name,
	   type_t.name as type_id,
       col.column_id,
       SUBSTRING(CAST(col.column_id + 100 AS char(3)), 2, 2)  + ': ' + col.name   AS ordered_column,
	   col.name                                         AS column_name,
       col.name                                         AS name,
       ST.name                                          AS data_type,
       ST.name                                          AS type_id,
       ST.name                                          AS declaration,
       (CASE col.Is_Nullable
       WHEN 1 THEN ''
       ELSE        'NOT NULL'
       END)                                             AS nullable,
       col.max_length                                   AS length,
       col.[precision]                                  AS precision,
       col.scale                                        AS scale,
       ST.collation                                     AS collation,
       0                                                As is_output,
	   col.system_type_id,
	   col.column_id

FROM sys.table_types type_t
JOIN sys.columns     col
    ON type_t.type_table_object_id = col.object_id
JOIN sys.systypes AS ST
ON  ST.xtype = col.system_type_id  and st.xusertype=col.user_type_id
where
	type_t.is_user_defined = 1
	and type_t.schema_id = schema_id('<schema_name>')
	and type_t.name = '<user_type_name>'

ORDER BY type_name,
         col.column_id