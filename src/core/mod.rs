#[macro_export]
macro_rules! ternary_operator {
    ($condition:expr, $if_true:expr, $if_false:expr) => {
        if $condition { $if_true } else { $if_false }
    };
    ($condition:expr, $if_true:expr) => {
        if $condition { Some($if_true) } else { None }
    };
}

#[macro_export]
macro_rules! ternary_operator_let {
    ($pat:pat = $expr:expr, $then:expr, $else:expr) => {
        if let $pat = $expr { $then } else { $else }
    };
    ($pat:pat = $expr:expr, $then:expr) => {
        if let $pat = $expr { Some($then) } else { None }
    };
}
