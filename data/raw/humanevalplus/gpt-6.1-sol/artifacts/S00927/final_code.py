import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    from fractions import Fraction
    if isinstance(x, Fraction):
        value = Fraction(0)
        for coefficient in reversed(xs):
            value = value * x + Fraction(coefficient)
        return value
    try:
        value = sum(coeff * math.pow(x, i)
                    for i, coeff in enumerate(xs) if coeff != 0)
        if math.isfinite(value):
            return value
    except (OverflowError, ValueError):
        pass
    # An individual power can overflow even though its coefficient makes
    # the term representable. Horner evaluation in Decimal avoids that.
    from decimal import Decimal, localcontext
    with localcontext() as context:
        context.prec = max(120, 24 * len(xs))
        point = Decimal(x)
        value = Decimal(0)
        for coefficient in reversed(xs):
            value = value * point + Decimal(coefficient)
        return float(value)


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
    coefficients = list(xs)
    while len(coefficients) > 1 and coefficients[-1] == 0:
        coefficients.pop()
    if not coefficients or all(c == 0 for c in coefficients):
        return 0.0
    if coefficients[0] == 0:
        return 0.0
    if len(coefficients) == 2:
        from fractions import Fraction
        exact = -Fraction(coefficients[0]) / Fraction(coefficients[1])
        try:
            approximate = float(exact)
            if abs(poly(xs, approximate)) < 1e-10:
                return approximate
        except OverflowError:
            pass
        return exact

    def evaluate(cs, x):
        value = 0.0
        magnitude = 0.0
        try:
            for coefficient in reversed(cs):
                value = value * x + coefficient
                magnitude = magnitude * abs(x) + abs(coefficient)
            if math.isfinite(value) and abs(value) > magnitude * 1e-12:
                return value
        except OverflowError:
            pass
        # Near cancellation, use extra precision to determine the sign.
        # A rounded zero in Horner's method need not be an actual root.
        from decimal import Decimal, localcontext
        with localcontext() as context:
            context.prec = max(120, 24 * len(cs))
            point = Decimal.from_float(float(x))
            result = Decimal(0)
            for coefficient in reversed(cs):
                result = result * point + Decimal(coefficient)
            return result

    def bisect(cs, left, right, f_left):
        while True:
            middle = left / 2 + right / 2
            if middle == left or middle == right:
                return min((left, right), key=lambda x: abs(evaluate(cs, x)))
            value = evaluate(cs, middle)
            if value == 0:
                return middle
            if (value < 0) == (f_left < 0):
                left, f_left = middle, value
            else:
                right = middle

    # Try a direct bracket first. It avoids division by a tiny leading
    # coefficient and needs only linear work per evaluation.
    def public_value(x):
        try:
            value = poly(xs, x)
            if math.isfinite(value):
                return value
        except (OverflowError, ValueError):
            pass
        return evaluate(coefficients, x)

    radius = 1.0
    for _ in range(1024 if len(coefficients) % 2 == 0 else 0):
        left, right = -radius, radius
        f_left, f_right = evaluate(coefficients, left), evaluate(coefficients, right)
        if f_left == 0:
            return left
        if f_right == 0 or (f_left < 0) != (f_right < 0):
            for _ in range(2200):
                middle = left / 2 + right / 2
                if middle == left or middle == right:
                    best = min((left, right), key=lambda x: abs(public_value(x)))
                    if abs(public_value(best)) < 1e-10:
                        return best
                    break
                value = evaluate(coefficients, middle)
                if value == 0:
                    # Keep refining to the first zero reached from the left;
                    # the midpoint can hide a different root inside the bracket.
                    right, f_right = middle, value
                    continue
                if (value < 0) == (f_left < 0):
                    left, f_left = middle, value
                else:
                    right, f_right = middle, value
            break
        if radius >= 8.98846567431158e307:
            break
        radius *= 2

    def roots(cs):
        if len(cs) == 2:
            return [-cs[0] / cs[1]]
        if len(cs) < 2:
            return []
        # Every real root lies within the Cauchy bound. Between successive
        # derivative roots the polynomial is monotonic.
        try:
            bound = 1.0 + max(abs(c / cs[-1]) for c in cs[:-1])
        except OverflowError:
            bound = math.inf
        if not math.isfinite(bound):
            bound = float.fromhex('0x1.fffffffffffffp+1023')
        critical = [x for x in roots([i * cs[i] for i in range(1, len(cs))])
                    if math.isfinite(x) and -bound < x < bound]
        points = [-bound] + sorted(critical) + [bound]
        result = []
        for point in critical:
            value = evaluate(cs, point)
            scale = 0.0
            for coefficient in reversed(cs):
                scale = scale * abs(point) + abs(coefficient)
            if abs(value) <= scale * 1e-25:
                result.append(point)
        left = points[0]
        f_left = evaluate(cs, left)
        for right in points[1:]:
            f_right = evaluate(cs, right)
            if f_left == 0:
                result.append(left)
            if f_right == 0:
                result.append(right)
            if f_left != 0 and f_right != 0 and (f_left < 0) != (f_right < 0):
                result.append(bisect(cs, left, right, f_left))
            left, f_left = right, f_right
        return result

    candidates = roots(coefficients)
    # Select using the public evaluator, including neighboring floats because
    # powers and Horner evaluation can round differently near a zero.
    def residual(x):
        try:
            value = abs(poly(xs, x))
            return value if math.isfinite(value) else math.inf
        except (OverflowError, ValueError):
            return math.inf

    polished = []
    for root in candidates:
        polished.append(root)
        lower = upper = root
        for _ in range(16):
            lower = math.nextafter(lower, -math.inf)
            upper = math.nextafter(upper, math.inf)
            polished.extend((lower, upper))
    best = min(polished, key=lambda x: (residual(x), abs(x)))
    if residual(best) < 1e-10:
        return best

    # Some polynomials have no float whose absolute residual is small:
    # the gap between neighboring floats is magnified by the derivative.
    # A rational approximation retains the extra digits needed in that case.
    from fractions import Fraction
    exact_coefficients = [Fraction(c) for c in coefficients]

    def exact_value(point):
        value = Fraction(0)
        for coefficient in reversed(exact_coefficients):
            value = value * point + coefficient
        return value

    center = Fraction(best)
    step = Fraction(math.ulp(best))
    for _ in range(1024):
        left, right = center - step, center + step
        f_left, f_right = exact_value(left), exact_value(right)
        if f_left == 0:
            return left
        if f_right == 0:
            return right
        if (f_left < 0) != (f_right < 0):
            break
        step *= 2
    else:
        return best

    tolerance = Fraction(1, 10 ** 12)
    for _ in range(4096):
        middle = (left + right) / 2
        value = exact_value(middle)
        if abs(value) < tolerance:
            return middle
        if (value < 0) == (f_left < 0):
            left, f_left = middle, value
        else:
            right = middle
    return middle
