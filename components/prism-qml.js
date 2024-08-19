(function (Prism) {

	// QML allows multi-line strings, although they are deprecated in favor of `template string literals`.
	// And let's make the closing quotes optional, to make the mistakes more visible.
	// pattern: /"(?:\\.|[^\\"\r\n])*"/,
	const qmlString = /"(?:\\.|[^\\"])*"?|'(?:\\.|[^\\'])*'?/;
	const jsComment = /\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))*\*\//;

	let jsExpr = /(?:[^\\()[\]{}"'/]|<string>|\/(?![*/])|<comment>|\(<expr>*\)|\[<expr>*\]|\{<expr>*\}|\\[\s\S])/
		.source
		.replace(/<string>/g, qmlString.source)
		.replace(/<comment>/g, jsComment.source);

	// the pattern will blow up, so only a few iterations
	for (let i = 0; i < 2; i++) {
		jsExpr = jsExpr.replace(/<expr>/g, jsExpr);
	}
	jsExpr = jsExpr.replace(/<expr>/g, '[^\\s\\S]');

	const qmlJS = Prism.util.clone(Prism.languages.javascript);
	qmlJS['string'] = {
		pattern: qmlString,
		greedy: true
	};

	const space = /(?:[ \t]|\/\*(?:[^*]|\*(?!\/))*\*\/)/;

	function replace(regexp, flags = 'm') {
		let source = regexp.source;
		if (source.includes("<space>")) {
			source = source.replace(/<space>/g, space.source);
		}
		if (source.includes("<identifier>")) {
			source = source.replace(/<identifier>/g, identifier.source);
		}
		if (source.includes("<identifier_title>")) {
			source = source.replace(/<identifier_title>/g, identifier_title.source);
		}
		if (source.includes("<identifier_untitle>")) {
			source = source.replace(/<identifier_untitle>/g, identifier_untitle.source);
		}
		if (source.includes("<object_lookbehind>")) {
			source = source.replace(/<object_lookbehind>/g, object_lookbehind.source);
		}
		if (source.includes("<property_type>")) {
			source = source.replace(/<property_type>/g, property_type.source);
		}
		if (source.includes("<js>")) {
			source = source.replace(/<js>/g, jsExpr);
		}
		return RegExp(source, flags);
	}

	const identifier = /\b[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\b/;
	const identifier_title = /\b[A-Z][$\w\xA0-\uFFFF]*\b/;
	const identifier_untitle = /\b_*[a-z][$\w\xA0-\uFFFF]*\b/;
	const object_lookbehind = /((?:^|[;{])[ \t]*)/;
	const property_type = replace(/(?:\blist<space>*<<space>*<identifier>(?:<space>*\.<space>*<identifier>)*<space>*>|\b<identifier>\b)/);

	const property_declaration_base = {
		'keyword': [
			replace(/^(default|required|readonly)(?:<space>+property\b)/),
			/^property/,
		],
		'property-type-and-name': {
			pattern: replace(/<property_type>(?:<space>+<identifier_untitle>)?/),
			inside: {
				'property-name': {
					pattern: replace(/(<property_type><space>+)<identifier_untitle>/),
					lookbehind: true,
					alias: 'property',
				},
				'keyword': /\blist(?=<space>*<)|\b(?:alias|var)\b/,
				'punctuation': /[<>\.]/,
				'class-name': identifier,
				'comment': {
					pattern: jsComment,
					greedy: true,
				},
			},
		},
		'comment': {
			pattern: jsComment,
			greedy: true,
		},
	};

	Prism.languages.qml = {
		'comment': {
			pattern: jsComment,
			greedy: true,
		},
		'pragma': {
			pattern: /\bpragma\b[^;\n]*/,
			inside: {
				'keyword': /^pragma/,
				'builtin': identifier_title,
				'punctuation': /[:,]/,
			},
		},
		'import': {
			pattern: /\bimport\b[^;\n]*/,
			inside: {
				'keyword': /(?:^import|as)\b/,
				'namespace': {
					pattern: replace(/(\bas\s+)<identifier_title>/),
					lookbehind: true,
				},
				'string': Prism.languages.clike.string,
				'version': {
					pattern: /\d+(\s*\.\s*\d+)?/,
					inside: {
						'number': /\d+/,
						'punctuation': /\./,
					},
				},
			},
		},
		'annotation': {
			pattern: /@/,
			alias: 'punctuation',
		},
		'object-name': {
			pattern: replace(/<identifier_title>(?:<space>*\.<space>*<identifier_title>)/),
			inside: {
				'namespace': replace(/^<identifier_title>(?=<space>*\.)/),
				'punctuation': /\./,
				'class-name': identifier_title,
			},
		},
		'qml-signal': {
			pattern: /((?:^|;)[ \t]*)signal\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*\([^\)]*\))?/m,
			lookbehind: true,
			greedy: true,
			inside: {
				'function': {
					pattern: /(^signal\s+)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
					lookbehind: true,
				},
				'keyword': /^signal\b/,
				'punctuation': /[\(\)<>,.]/,
				// Only highlight type names. Signal arguments are specified as pairs `type1 name1` or `name1: type1`
				'class-name': [
					replace(/<property_type>(?=<space>+<identifier>)/),
					{
						pattern: replace(/(<identifier><space>*:<space>*)<property_type>/),
						lookbehind: true,
					}
				],
				'comment': {
					pattern: jsComment,
					greedy: true,
				},
			},
		},
		'qml-method': {
			// pattern: replace(/((?:^|;)[ \t]*)function\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*\(<js>*\)\s+(?::<space>*<property_type><space>*)?\{<js>*\}/),
			pattern: replace(/((?:^|;)[ \t]*)function\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*\(<js>*\)\s*:<space>*(?:<property_type>\s*)?\{<js>*\}/),
			lookbehind: true,
			greedy: true,
			alias: 'language-javascript',
			inside: qmlJS,
		},
		'javascript-function': {
			pattern: replace(/((?:^|;)[ \t]*)function\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*\(<js>*\)\s*\{<js>*\}/),
			lookbehind: true,
			greedy: true,
			alias: 'language-javascript',
			inside: qmlJS,
		},
		'property-declaration': [
			// component id, special case
			{
				pattern: replace(/<object_lookbehind>id(?:<space>*:<space>*<identifier>)/, 'm'),
				lookbehind: true,
				inside: {
					'keyword': /^id/,
					'punctuation': /:/,
					'variable': identifier,
				},
			},
			// property binding, value is required
			{
				pattern: replace(/<object_lookbehind><identifier>(?:\.<identifier>)*(?=<space>*:)/, 'm'),
				lookbehind: true,
				inside: {
					'property': identifier,
					'punctuation': /\./,
				},
			},
			// required property redeclaration, value is illegal, "property" can be a property name
			{
				pattern: replace(/<object_lookbehind>required<space>+<identifier_untitle>(?!<space>+<property_type>)/, 'm'),
				lookbehind: true,
				inside: property_declaration_base,
			},
			// required property declaration, value is illegal
			{
				pattern: replace(/<object_lookbehind>required(?:<space>+property\b<space>+<property_type>(?:<space>+<identifier_untitle>)?)?/, 'm'),
				lookbehind: true,
				inside: property_declaration_base,
			},
			// readonly property declaration, value is required
			{
				pattern: replace(/<object_lookbehind>readonly(?:<space>+property\b(?:<space>+<property_type>(?:<space>+<identifier_untitle>)?)?)?/, 'm'),
				lookbehind: true,
				greedy: true,
				inside: property_declaration_base,
			},
			// default property declaration, value is optional
			{
				pattern: replace(/<object_lookbehind>default(?:<space>+property\b(?:<space>+<property_type>(?:<space>+<identifier_untitle>)?)?)?/, 'm'),
				lookbehind: true,
				greedy: true,
				inside: property_declaration_base,
			},
			// binding for a property named "property"
			{
				pattern: replace(/<object_lookbehind>property<space>*:/),
				lookbehind: true,
				inside: {
					'property': identifier_untitle,
					'punctuation': ':',
				},
			},
			// regular property declaration
			{
				pattern: replace(/<object_lookbehind>property\b(?:<space>+<property_type>(?:<space>+<identifier_untitle>)?)?/m),
				lookbehind: true,
				inside: property_declaration_base,
			},
		],
		'class-name': [
			{
				pattern: /((?:^|[:;,\[])[ \t]*)(?!\d)\w+(?=[ \t]*\{|[ \t]+on\b)/m,
				lookbehind: true
			},
			{
				pattern: replace(/(\b(?:enum|component)<space>+)<identifier_title>/),
				lookbehind: true,
			}
		],
		'qml-object-list': {
			pattern: replace(/(:\s*)(?=\[<space>*<identifier_title>)/, 'm'),
		},
		'javascript-expression': {
			pattern: replace(/(:\s*)(?![\s;}[])(?:(?!$|[;}])<js>)+/),
			lookbehind: true,
			greedy: true,
			alias: 'language-javascript',
			inside: qmlJS,
		},
		// QML allows multi-line strings, although they are deprecated in favor of `template string literals`.
		// And let's make the closing quotes optional, to make the mistakes more visible.
		// pattern: /"(?:\\.|[^\\"\r\n])*"/,
		'string': {
			pattern: qmlString,
			greedy: true,
		},
		'keyword': /\b(?:as|on|enum|component)\b/,
		'punctuation': /[{}[\]:;,]/,
		// enum support
		'operator': /[=]/,
		'number': qmlJS.number,
	};

}(Prism));
