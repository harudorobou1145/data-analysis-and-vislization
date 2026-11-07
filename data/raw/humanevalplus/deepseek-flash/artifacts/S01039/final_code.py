import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def _trim(coefficients: list) -> list:
    result = list(coefficients)
    while result and result[-1] == 0:
        result.pop()
    return result


def _value(coefficients: list, x: float) -> float:
    result = coefficients[-1]
    for coefficient in reversed(coefficients[:-1]):
        result = result * x + coefficient
    return result


def _derivative(coefficients: list) -> list:
    return [i * coefficient for i, coefficient in enumerate(coefficients)][1:]


def _term_scale(coefficients: list, x: float) -> float:
    scale = 0.0
    power = 1.0
    for coefficient in coefficients:
        scale += abs(coefficient) * power
        power *= abs(x)
    return scale


def _bisect(coefficients: list, low: float, high: float) -> float:
    value_low = _value(coefficients, low)
    value_high = _value(coefficients, high)
    if value_low == 0.0:
        return low
    if value_high == 0.0:
        return high

    for _ in range(200):
        midpoint = low / 2.0 + high / 2.0
        if midpoint == low or midpoint == high:
            return midpoint
        value_mid = _value(coefficients, midpoint)
        if value_mid == 0.0:
            return midpoint
        if (value_mid > 0.0) == (value_low > 0.0):
            low = midpoint
            value_low = value_mid
        else:
            high = midpoint
            value_high = value_mid
    return low / 2.0 + high / 2.0


def _add_root(roots: list, candidate: float) -> None:
    if not math.isfinite(candidate):
        return
    tolerance = 1e-9 * max(1.0, abs(candidate))
    if all(abs(root - candidate) > tolerance for root in roots):
        roots.append(candidate)


def _root_bound(coefficients: list) -> float:
    leading = abs(coefficients[-1])
    largest_ratio = 0.0
    for coefficient in coefficients[:-1]:
        largest_ratio = max(largest_ratio, abs(coefficient) / leading)
    return 1.0 + largest_ratio


def _real_roots(coefficients: list) -> list:
    coefficients = _trim(coefficients)
    degree = len(coefficients) - 1
    if degree <= 0:
        return []
    if degree == 1:
        return [-coefficients[0] / coefficients[1]]

    bound = _root_bound(coefficients)
    if not math.isfinite(bound):
        return []

    critical = _real_roots(_derivative(coefficients))
    points = [-bound]
    for point in sorted(critical):
        if -bound < point < bound and not math.isclose(
            point, points[-1], rel_tol=1e-10, abs_tol=1e-12
        ):
            points.append(point)
    if not math.isclose(bound, points[-1], rel_tol=1e-10, abs_tol=1e-12):
        points.append(bound)

    values = []
    roots = []
    for point in points:
        value = _value(coefficients, point)
        values.append(value)
        scale = _term_scale(coefficients, point)
        if math.isfinite(value) and math.isfinite(scale):
            if abs(value) <= 1e-11 * scale:
                _add_root(roots, point)

    for i in range(len(points) - 1):
        left_value = values[i]
        right_value = values[i + 1]
        if left_value == 0.0 or right_value == 0.0:
            continue
        if (left_value > 0.0) != (right_value > 0.0):
            _add_root(roots, _bisect(coefficients, points[i], points[i + 1]))

    return sorted(roots)


def _bracketed_zero(coefficients: list) -> float:
    left = -1.0
    right = 1.0
    while _value(coefficients, left) * _value(coefficients, right) > 0:
        left *= 2.0
        right *= 2.0
    return _bisect(coefficients, left, right)


def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    coefficients = _trim(xs)
    if not coefficients:
        return 0.0
    if len(coefficients) == 1:
        return 0.0

    scale = max(abs(coefficient) for coefficient in coefficients)
    normalized = [coefficient / scale for coefficient in coefficients]

    if normalized[0] == 0.0:
        return 0.0

    if len(normalized) > 129:
        return _bracketed_zero(normalized)

    roots = _real_roots(normalized)
    if roots:
        nonnegative_roots = [candidate for candidate in roots if candidate >= 0.0]
        root = min(nonnegative_roots) if nonnegative_roots else max(roots)
        nearest_integer = round(root)
        if abs(root - nearest_integer) <= 1e-4 * max(1.0, abs(root)):
            integer_root = float(nearest_integer)
            value = _value(normalized, integer_root)
            term_scale = _term_scale(normalized, integer_root)
            if math.isfinite(value) and math.isfinite(term_scale):
                if abs(value) <= 1e-10 * term_scale:
                    return integer_root
        return root

    return _bracketed_zero(normalized)
