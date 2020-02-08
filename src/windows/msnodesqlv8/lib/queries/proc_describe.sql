select
    is_output,
    sp.name,
    type_id   = type_name(sp.user_type_id),
    sp.max_length,
    'order'  = parameter_id,
    'collation'   = convert(sysname,
        case
            when sp.system_type_id in (35, 99, 167, 175, 231, 239)
                then ServerProperty('collation') end),
    ty.is_user_defined
 from
	sys.parameters sp
	left outer join sys.table_types ty
	    on ty.name=type_name(sp.user_type_id)
		and ty.schema_id = schema_id('<schema_name>')
	where
	    object_id = object_id('<escaped_procedure_name>')